import type { Strata, BaseEntity, Repository, SingletonRepository } from "@strata/core"
import {
  importLogEntity,
  type ImportLog,
  type ImportLogFileSource,
  type ImportLogEmailSource,
} from "@/services/entities/import-log"
import {
  emailImportSettingEntity,
  type EmailImportSetting,
} from "@/services/entities/email-import-setting"
import { notify } from "@/services/notifications"
import {
  userSettingsEntity,
  USER_SETTINGS_DEFAULTS,
  type UserSettings,
} from "@/services/entities/user-settings"
import {
  transactionEntity,
  type Transaction,
} from "@/services/entities/transaction"
import {
  moneyAccountEntity,
  type MoneyAccount,
} from "@/services/entities/money-account"
import type { AuthAccount } from "@/services/entities/auth-account"
import { authAccountEntity } from "@/services/entities/auth-account"
import { ImportContext } from "./import-context"
import type { PromptAnswer } from "./import-context"
import { runFileImport, type FileImportResult } from "./file-import-context"
import { runEmailImport, type EmailImportResult } from "./email-import-context"
import { CancelledError, EmailPasswordError } from "./import-utils"
import { log } from "@/log"

// ── Active context entry ────────────────────────────────

type ActiveImport = {
  readonly logId: string
  readonly ctx: ImportContext
}

// ── Service ─────────────────────────────────────────────

/**
 * Orchestrates file and email imports. One instance per `Strata`.
 *
 * Responsibilities:
 * - Creates/updates `importLog` rows as imports progress.
 * - Writes `transaction` rows with `activityLogId` pointing to the log.
 * - Spawns `notification` rows on failure.
 * - Maintains an in-memory map of active contexts for prompt relay.
 * - On construction, runs an init sweep to purge stale file-source
 *   `needs_input` rows left over from a previous session.
 */
export class ImportService {
  private readonly strata: Strata
  private readonly logRepo: Repository<ImportLog>
  private readonly settingsRepo: Repository<EmailImportSetting>
  private readonly userSettingsRepo: SingletonRepository<UserSettings>
  private readonly txRepo: Repository<Transaction>
  private readonly accountRepo: Repository<MoneyAccount>
  private readonly active = new Map<string, ActiveImport>()

  constructor(strata: Strata) {
    this.strata = strata
    this.logRepo = strata.repo(importLogEntity)
    this.settingsRepo = strata.repo(emailImportSettingEntity)
    this.userSettingsRepo = strata.repo(userSettingsEntity)
    this.txRepo = strata.repo(transactionEntity)
    this.accountRepo = strata.repo(moneyAccountEntity)
    log.import('service initialised')
    this.initSweep()
  }

  // ── Public API ──────────────────────────────────────────

  /** Start a file import. Returns the log id. */
  startFileImport(file: File): string {
    const source: ImportLogFileSource = {
      kind: "file",
      fileName: file.name,
      fileType: file.type || undefined,
      fileSize: file.size,
    }
    const logId = this.createLog("manual", source)
    const ctx = new ImportContext()
    this.active.set(logId, { logId, ctx })
    log.import('file import started: %s (%s, %d bytes) logId=%s', file.name, file.type, file.size, logId)

    void this.executeFileImport(logId, ctx, file)
    return logId
  }

  /** Start an email sync for an account. Returns the log id. */
  startEmailSync(account: AuthAccount & BaseEntity): string {
    const source: ImportLogEmailSource = {
      kind: "email",
      authAccountId: account.id,
      emailId: "",          // filled per-email during the sweep
      receivedAt: 0,
      from: account.email,
      subject: "",
    }
    const logId = this.createLog("manual", source)
    const ctx = new ImportContext()
    this.active.set(logId, { logId, ctx })
    log.import('email sync started: %s logId=%s', account.email, logId)

    void this.executeEmailImport(logId, ctx, account)
    return logId
  }

  /** Relay a user's answer to a prompt. */
  answer(logId: string, ans: PromptAnswer): void {
    const entry = this.active.get(logId)
    if (!entry) return
    entry.ctx.answer(ans)
  }

  /** Cancel a running import. */
  cancel(logId: string): void {
    const entry = this.active.get(logId)
    if (!entry) return
    entry.ctx.cancel()
  }

  /** Get the active context for a log id (for UI binding). */
  getContext(logId: string): ImportContext | undefined {
    return this.active.get(logId)?.ctx
  }

  /** Get all active log ids. */
  activeLogIds(): ReadonlyArray<string> {
    return [...this.active.keys()]
  }

  /** Number of imports currently running or parked awaiting input. */
  activeImportCount(): number {
    return this.active.size
  }

  /**
   * Resume a persisted `needs_input` email-source log. Rebuilds the context
   * from the log's source descriptor, replays passwords from the vault,
   * and forces the prior `adapterId` if one was resolved.
   */
  resume(logId: string): string | null {
    const existingLog = this.logRepo.get(logId)
    if (!existingLog) return null
    if (existingLog.source.kind !== "email") return null

    // Allow resume for needs_input OR failed password-required
    const canResume = existingLog.status === "needs_input" ||
      (existingLog.status === "failed" && existingLog.error?.kind === "password-required")
    if (!canResume) return null

    // Look up the auth account
    const authRepo = this.strata.repo(authAccountEntity)
    const account = authRepo.get(existingLog.source.authAccountId)
    if (!account) {
      log.import.error('resume failed: auth account %s not found', existingLog.source.authAccountId)
      return null
    }

    // Reuse the existing log id — update status back to in_progress
    this.updateLog(logId, { status: "in_progress", prompt: undefined })
    const ctx = new ImportContext()
    this.active.set(logId, { logId, ctx })
    log.import('resuming email import: logId=%s account=%s', logId, account.email)

    void this.executeEmailImport(logId, ctx, account)
    return logId
  }

  // ── File import execution ─────────────────────────────

  private async executeFileImport(
    logId: string,
    ctx: ImportContext,
    file: File,
  ): Promise<void> {
    try {
      const settings = this.getUserSettings()
      const result = await runFileImport(
        ctx, file, settings.filePasswords,
        this.accountRepo, this.txRepo,
      )
      this.commitFileResult(logId, result)
      ctx.status = "completed"
      log.import('file import completed: logId=%s parsed=%d new=%d dup=%d', logId, result.transactions.length, result.newCount, result.duplicateCount)
      this.updateLog(logId, { status: "completed", completedAt: Date.now() })
    } catch (err) {
      this.handleError(logId, ctx, err)
    } finally {
      this.active.delete(logId)
      ctx.dispose()
    }
  }

  private commitFileResult(logId: string, result: FileImportResult): void {
    // Create or resolve account
    const accountId = result.accountId || this.createAccount(result)

    // Write transactions
    const newTxs = result.transactions.filter((t) => t.isNew)
    for (const tx of newTxs) {
      this.txRepo.save({
        accountId,
        title: tx.description,
        transactionAt: tx.date,
        amount: { units: tx.amount },
        hash: tx.hash,
        activityLogId: logId,
      })
    }

    // Append new passwords to vault
    if (result.newPasswords.length > 0) {
      this.appendPasswords(result.newPasswords)
    }

    // Update log
    this.updateLog(logId, {
      status: "completed",
      completedAt: Date.now(),
      adapterId: result.adapterId,
      touchedAccountIds: [accountId],
      counts: {
        parsed: result.transactions.length,
        new: result.newCount,
        duplicate: result.duplicateCount,
      },
    })
  }

  // ── Email import execution ────────────────────────────

  private async executeEmailImport(
    logId: string,
    ctx: ImportContext,
    account: AuthAccount & BaseEntity,
  ): Promise<void> {
    try {
      const emailSetting = this.getOrCreateEmailSetting(account)
      const passwords = [...this.getUserSettings().filePasswords]

      // Retry loop for password-required errors
      for (;;) {
        try {
          const result = await runEmailImport(
            ctx, account, emailSetting.importState,
            passwords, this.accountRepo, this.txRepo,
          )
          this.commitEmailResult(logId, result, account)
          ctx.status = "completed"
          log.import('email sync completed: logId=%s emails=%d imported=%d', logId, result.readEmailCount, result.importedEmailCount)

          // Update email setting with new state
          this.settingsRepo.save({
            ...emailSetting,
            importState: result.state,
            lastErrorLogId: undefined,
          })

          // Persist any new passwords
          const origSet = new Set(this.getUserSettings().filePasswords)
          const newPwds = passwords.filter((p) => !origSet.has(p))
          if (newPwds.length > 0) this.appendPasswords(newPwds)

          return
        } catch (innerErr) {
          if (innerErr instanceof EmailPasswordError) {
            log.import('email sync needs password: logId=%s emailId=%s', logId, innerErr.emailId)
            // Update the log source with the real email ID so the UI can fetch it
            const existingLog = this.logRepo.get(logId)
            if (existingLog && existingLog.source.kind === "email") {
              this.updateLog(logId, {
                source: { ...existingLog.source, emailId: innerErr.emailId },
              })
            }
            this.updateLog(logId, { status: "needs_input", prompt: { kind: "password" } })
            // Notify the user — the import is parked until they respond
            this.notifyNeedsInput(logId, account)
            const answer = await ctx.waitForAnswer({ kind: "password" })
            if (ctx.isCancelled()) throw new CancelledError()
            if (answer.kind !== "password") throw new Error("Unexpected answer kind", { cause: innerErr })
            passwords.push(answer.password)
            ctx.status = "in_progress"
            this.updateLog(logId, { status: "in_progress", prompt: undefined })
            continue
          }
          throw innerErr
        }
      }
    } catch (err) {
      this.handleError(logId, ctx, err)
      // Persist error on the email setting
      if (account.id) {
        const settings = this.settingsRepo.query({ where: { authAccountId: account.id } })
        if (settings.length > 0) {
          this.settingsRepo.save({ ...settings[0], lastErrorLogId: logId })
        }
      }
    } finally {
      this.active.delete(logId)
      ctx.dispose()
    }
  }

  private commitEmailResult(
    logId: string,
    result: EmailImportResult,
    account: AuthAccount & BaseEntity,
  ): void {
    const touchedAccountIds = new Set<string>()

    for (const emailResult of result.processedEmails) {
      const accountId = emailResult.accountId || this.createAccountFromEmail(emailResult, account)
      touchedAccountIds.add(accountId)

      const newTxs = emailResult.transactions.filter((t) => t.isNew)
      for (const tx of newTxs) {
        this.txRepo.save({
          accountId,
          title: tx.description,
          transactionAt: tx.date,
          amount: { units: tx.amount },
          hash: tx.hash,
          activityLogId: logId,
        })
      }
    }

    const totalParsed = result.processedEmails.reduce((s, e) => s + e.transactions.length, 0)
    const totalNew = result.processedEmails.reduce((s, e) => s + e.newCount, 0)
    const totalDup = result.processedEmails.reduce((s, e) => s + e.duplicateCount, 0)

    this.updateLog(logId, {
      status: "completed",
      completedAt: Date.now(),
      touchedAccountIds: [...touchedAccountIds],
      counts: { parsed: totalParsed, new: totalNew, duplicate: totalDup },
      emailRun: {
        windowStart: result.windowStart,
        windowEnd: result.windowEnd,
        readEmailCount: result.readEmailCount,
        importedEmailCount: result.importedEmailCount,
      },
    })
  }

  // ── Error handling ────────────────────────────────────

  private handleError(logId: string, ctx: ImportContext, err: unknown): void {
    if (err instanceof CancelledError) {
      log.import('import cancelled: logId=%s', logId)
      ctx.status = "cancelled"
      this.updateLog(logId, { status: "cancelled", completedAt: Date.now() })
      return
    }

    const error = err instanceof Error ? err : new Error(String(err))
    log.import.error('import failed: logId=%s error=%s', logId, error.message)
    ctx.error = error
    ctx.status = "failed"

    const kind = classifyErrorKind(error)
    this.updateLog(logId, {
      status: "failed",
      completedAt: Date.now(),
      error: { kind, message: error.message },
    })

    // Spawn notification
    notify(this.strata, {
      kind: "import-error",
      display: "error",
      title: "Import failed",
      body: error.message,
      ref: { type: "import-log", logId },
    })
  }

  /** Notify the user that a background email import is parked awaiting input. */
  private notifyNeedsInput(logId: string, account: AuthAccount & BaseEntity): void {
    notify(this.strata, {
      kind: "import-needs-input",
      display: "warning",
      title: "Import needs your input",
      body: `The import from ${account.email} needs a password to continue.`,
      ref: { type: "import-log", logId },
    })
  }

  // ── Init sweep ────────────────────────────────────────

  private initSweep(): void {
    // Purge stale file-source needs_input rows — the File blob is gone
    const allLogs = this.logRepo.query()
    let swept = 0
    for (const logEntry of allLogs) {
      if (logEntry.status === "needs_input" && logEntry.source.kind === "file") {
        this.updateLog(logEntry.id, {
          status: "cancelled",
          completedAt: Date.now(),
          error: { kind: "abandoned", message: "Import file no longer available after reload" },
        })
        swept++
      }
      // Also clean up in_progress logs from crashed sessions
      if (logEntry.status === "in_progress" || logEntry.status === "pending") {
        this.updateLog(logEntry.id, {
          status: "cancelled",
          completedAt: Date.now(),
          error: { kind: "abandoned", message: "Import interrupted by page reload" },
        })
        swept++
      }
    }
    if (swept > 0) log.import('init sweep: cancelled %d stale logs', swept)
  }

  // ── Log CRUD ──────────────────────────────────────────

  private createLog(
    trigger: "manual",
    source: ImportLogFileSource | ImportLogEmailSource,
  ): string {
    return this.logRepo.save({
      trigger,
      triggeredAt: Date.now(),
      status: "in_progress",
      source,
      touchedAccountIds: [],
      counts: { parsed: 0, new: 0, duplicate: 0 },
    })
  }

  private updateLog(logId: string, patch: Partial<ImportLog>): void {
    const existing = this.logRepo.get(logId)
    if (!existing) return
    this.logRepo.save({ ...existing, ...patch })
  }

  // ── Account creation ─────────────────────────────────

  private createAccount(result: FileImportResult): string {
    return this.accountRepo.save({
      kind: result.importData.kind,
      name: result.importData.bankId,
      currency: result.importData.account.currency,
      initialBalance: { units: 0 },
      bankId: result.importData.bankId,
      metadata: buildMetadata(result.importData.account),
    })
  }

  private createAccountFromEmail(
    emailResult: { adapterId: string; transactions: ReadonlyArray<{ amount: number }> },
    account: AuthAccount & BaseEntity,
  ): string {
    const [bankId] = emailResult.adapterId.split("/")
    return this.accountRepo.save({
      kind: "bank",
      name: bankId || account.email,
      currency: "INR",  // default; updated on next parse
      initialBalance: { units: 0 },
      bankId,
    })
  }

  // ── Settings helpers ──────────────────────────────────

  private getUserSettings(): UserSettings {
    return this.userSettingsRepo.get() ?? USER_SETTINGS_DEFAULTS
  }

  private appendPasswords(newPasswords: readonly string[]): void {
    const current = this.getUserSettings()
    const existing = new Set(current.filePasswords)
    const toAdd = newPasswords.filter((p) => !existing.has(p))
    if (toAdd.length === 0) return
    this.userSettingsRepo.save({
      ...current,
      filePasswords: [...current.filePasswords, ...toAdd],
    })
  }

  private getOrCreateEmailSetting(account: AuthAccount & BaseEntity): EmailImportSetting & BaseEntity {
    const existing = this.settingsRepo.query({ where: { authAccountId: account.id } })
    if (existing.length > 0) return existing[0]

    const id = this.settingsRepo.save({
      authAccountId: account.id,
      paused: false,
      importState: {},
    })
    const created = this.settingsRepo.get(id)
    if (!created) throw new Error(`Failed to create email import setting for ${account.id}`)
    return created
  }
}

// ── Utilities ───────────────────────────────────────────

function buildMetadata(
  account: import("@fin-app/adapters").AccountDetails,
): Record<string, readonly string[]> {
  const meta: Record<string, readonly string[]> = {}
  if (account.accountNumber?.length) meta["accountNumber"] = account.accountNumber
  if (account.ifscCode?.length) meta["ifscCode"] = account.ifscCode
  if (account.swiftCode?.length) meta["swiftCode"] = account.swiftCode
  if (account.micrCode?.length) meta["micrCode"] = account.micrCode
  if (account.customerId?.length) meta["customerId"] = account.customerId
  if (account.accountHolderName?.length) meta["accountHolderName"] = account.accountHolderName
  return meta
}

function isParseError(err: Error): err is import("@fin-app/adapters").ParseError {
  return err.name === "ParseError" && "kind" in err
}

function classifyErrorKind(err: Error): string {
  if (isParseError(err)) return err.kind
  const msg = err.message.toLowerCase()
  if (msg.includes("refresh") || msg.includes("token") || msg.includes("401") || msg.includes("unauthorized")) return "auth"
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) return "network"
  return "unknown"
}
