import type { FyreDb, BaseEntity, RepositoryType as Repository, SingletonRepositoryType as SingletonRepository } from "@fyre-db/core"
import type { Observable } from "rxjs"
import {
  importLogEntity,
  type ImportLog,
  type ImportLogFileSource,
  type ImportLogEmailSource,
} from "@/services/entities/import-log"
import {
  importSourceEntity,
  importSourceMonthKey,
  type ImportSource,
  type ImportSourceDescriptor,
} from "@/services/entities/import-source"
import {
  emailImportSettingEntity,
  type EmailImportSetting,
  type EmailImportState,
} from "@/services/entities/email-import-setting"
import type { NotificationsService } from "@/services/notifications/notifications-service"
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
  type AccountStatement,
  type MoneyAccount,
} from "@/services/entities/money-account"
import type { TransactionsService } from "@/services/transactions-service"
import type { Disposable } from "@/services/types"
import type { AuthAccount } from "@/services/entities/auth-account"
import { authAccountEntity } from "@/services/entities/auth-account"
import { ImportContext } from "./import-context"
import type { PromptAnswer } from "./import-context"
import { runFileImport, type FileImportResult } from "./file-import-context"
import { runEmailImport, type EmailResult, type EmailRunProgress } from "./email-import-context"
import { CancelledError, EmailPasswordError, findMatchingAccounts, mergeMetadata } from "./import-utils"
import { log } from "@/log"

// ── Active context entry ────────────────────────────────

type ActiveImport = {
  readonly logId: string
  readonly ctx: ImportContext
}

// ── Service ─────────────────────────────────────────────

/**
 * Orchestrates file and email imports. One instance per `FyreDb`.
 *
 * Responsibilities:
 * - Creates/updates `importLog` rows (the run aggregate) as imports progress.
 * - Creates one `importSource` per imported email/file that yielded data, and
 *   writes `transaction` rows with `sourceId` pointing to that source.
 * - Spawns `notification` rows on failure.
 * - Maintains an in-memory map of active contexts for prompt relay.
 * - On construction, runs an init sweep to purge stale file-source
 *   `needs_input` rows left over from a previous session.
 */
export class ImportService implements Disposable {
  private readonly fyredb: FyreDb
  private readonly logRepo: Repository<ImportLog>
  private readonly sourceRepo: Repository<ImportSource>
  private readonly settingsRepo: Repository<EmailImportSetting>
  private readonly userSettingsRepo: SingletonRepository<UserSettings>
  private readonly txRepo: Repository<Transaction>
  private readonly accountRepo: Repository<MoneyAccount>
  private readonly txService: TransactionsService
  private readonly notifications: NotificationsService
  private readonly active = new Map<string, ActiveImport>()

  constructor(fyredb: FyreDb, deps: { readonly transactions: TransactionsService; readonly notifications: NotificationsService }) {
    this.fyredb = fyredb
    this.logRepo = fyredb.repo(importLogEntity)
    this.sourceRepo = fyredb.repo(importSourceEntity)
    this.settingsRepo = fyredb.repo(emailImportSettingEntity)
    this.userSettingsRepo = fyredb.repo(userSettingsEntity)
    this.txRepo = fyredb.repo(transactionEntity)
    this.accountRepo = fyredb.repo(moneyAccountEntity)
    this.txService = deps.transactions
    this.notifications = deps.notifications
    log.import('service initialised')
    this.initSweep()
  }

  // ── Public API ──────────────────────────────────────────

  /** Observe a single import log row, live. */
  observeLog(logId: string): Observable<(ImportLog & BaseEntity) | undefined> {
    return this.logRepo.observe(logId)
  }

  /** Observe the import logs in the given month partitions, live. */
  observeLogs(keys: readonly string[]): Observable<readonly (ImportLog & BaseEntity)[]> {
    return this.logRepo.observeQuery({ keys })
  }

  /**
   * Observe the `importSource` rows for a run — scoped to the run's month plus
   * the current month so a sweep that crosses a boundary still resolves.
   */
  observeSources(log: ImportLog & BaseEntity): Observable<readonly (ImportSource & BaseEntity)[]> {
    const keys = [...new Set([importSourceMonthKey(log.triggeredAt), importSourceMonthKey(Date.now())])]
    return this.sourceRepo.observeQuery({ keys, where: { importLogId: log.id } })
  }

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

  /** Start an email sync for an account. Returns the log id.
   *
   * Guards against concurrent sweeps of the same mailbox: a second trigger
   * while a run is already live (`in_progress` or parked on `needs_input`)
   * returns the existing log id instead of spawning a parallel run. Two runs
   * would race on the single shared `EmailImportSetting.importState` cursor and
   * corrupt the high-water mark. */
  startEmailSync(accountId: string): string {
    const account = this.fyredb.repo(authAccountEntity).get(accountId)
    if (account === undefined) {
      log.import('email sync: unknown account=%s', accountId)
      return ""
    }
    const existing = this.findActiveEmailLog(account.id)
    if (existing) {
      log.import('email sync already active: account=%s logId=%s', account.email, existing)
      return existing
    }

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

  /** The live (`in_progress` / `needs_input`) email-sweep log id for an
   *  account, if one is currently active. */
  private findActiveEmailLog(authAccountId: string): string | null {
    for (const logId of this.active.keys()) {
      const row = this.logRepo.get(logId)
      if (row?.source.kind === "email" && row.source.authAccountId === authAccountId) {
        return logId
      }
    }
    return null
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

  /** Tear down on tenant switch: cancel/detach every live import context. */
  dispose(): void {
    for (const entry of this.active.values()) entry.ctx.dispose()
    this.active.clear()
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
    const authRepo = this.fyredb.repo(authAccountEntity)
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
        (pw) => { this.appendPasswords([pw]) },
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
    // Create or resolve account. When an existing account is reused, fold the
    // statement's metadata into it (a re-import may carry complementary fields,
    // e.g. a full vs. masked account number, or a code one format omits).
    const existingAccountId = result.accountId
    const accountId = existingAccountId || this.createAccount(result)
    if (existingAccountId) {
      this.mergeAccountMetadata(existingAccountId, buildMetadata(result.importData.account))
      this.mergeAccountStatement(
        existingAccountId,
        toAccountStatement(result.importData.statement, result.importData.transactions),
      )
    }

    // Write transactions, parented to a per-file source row (only created
    // when the file actually yielded new data).
    const newTxs = result.transactions.filter((t) => t.isNew)
    if (newTxs.length > 0) {
      const log = this.logRepo.get(logId)
      /* v8 ignore start -- the log is always the file-source row created at startFileImport */
      const descriptor: ImportSourceDescriptor =
        log?.source.kind === "file"
          ? log.source
          : { kind: "file", fileName: "import" }
      /* v8 ignore stop */
      const sourceId = this.createSource(logId, descriptor, {
        adapterId: result.adapterId,
        accountId,
        counts: {
          parsed: result.transactions.length,
          new: result.newCount,
          duplicate: result.duplicateCount,
        },
      })
      this.txService.importNewTransactions(
        newTxs.map((tx) => ({
          accountId,
          narration: tx.description,
          transactionAt: tx.date,
          amount: tx.amount,
          hash: tx.hash,
          sourceId,
        })),
      )
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
      const passwords = [...this.getUserSettings().filePasswords]

      // Accumulators across the (possibly multi-attempt) run. Each email is
      // committed here, immediately before the sweep checkpoints it.
      const touchedAccountIds = new Set<string>()
      let parsed = 0
      let newCount = 0
      let duplicate = 0

      const commitEmail = (result: EmailResult): void => {
        const accountId = this.resolveOrCreateEmailAccount(result, account)
        touchedAccountIds.add(accountId)
        const newTxs = result.transactions.filter((t) => t.isNew)
        // Only inputs that yield new data get a source row, so source count is
        // bounded by the run's imported count, never by mailbox size.
        if (newTxs.length > 0) {
          const descriptor: ImportSourceDescriptor = {
            kind: "email",
            authAccountId: account.id,
            emailId: result.emailId,
            receivedAt: result.date,
            from: result.from,
            subject: result.subject,
          }
          const sourceId = this.createSource(logId, descriptor, {
            adapterId: result.adapterId,
            accountId,
            counts: {
              parsed: result.transactions.length,
              new: result.newCount,
              duplicate: result.duplicateCount,
            },
          })
          this.txService.importNewTransactions(
            newTxs.map((tx) => ({
              accountId,
              narration: tx.description,
              transactionAt: tx.date,
              amount: tx.amount,
              hash: tx.hash,
              sourceId,
            })),
          )
        }
        parsed += result.transactions.length
        newCount += result.newCount
        duplicate += result.duplicateCount
      }

      const saveState = (state: EmailImportState): void => {
        const current = this.getOrCreateEmailSetting(account)
        this.settingsRepo.save({ ...current, importState: state, lastErrorLogId: undefined })
      }

      // Flush a live snapshot of the run once per page so the import surface
      // can render a moving time-progress bar. The per-source breakdown is
      // derived from `importSource` rows, not stored on the log.
      const reportProgress = (progress: EmailRunProgress): void => {
        this.updateLog(logId, {
          status: "in_progress",
          touchedAccountIds: [...touchedAccountIds],
          counts: { parsed, new: newCount, duplicate },
          emailRun: {
            newestAt: progress.newestAt,
            cursorAt: progress.cursorAt,
            targetAt: progress.targetAt,
            scanned: progress.scanned,
            imported: progress.imported,
            currentFrom: progress.currentFrom,
          },
        })
      }

      // Retry loop for password-required errors
      for (;;) {
        try {
          const summary = await runEmailImport(
            ctx, account, this.getOrCreateEmailSetting(account).importState,
            passwords, this.txRepo, { commitEmail, saveState, reportProgress },
          )
          ctx.status = "completed"
          log.import('email sync completed: logId=%s emails=%d imported=%d', logId, summary.scanned, summary.imported)

          // Persist any new passwords
          const origSet = new Set(this.getUserSettings().filePasswords)
          const newPwds = passwords.filter((p) => !origSet.has(p))
          /* v8 ignore next -- passwords persist on answer, so none are new by completion */
          if (newPwds.length > 0) this.appendPasswords(newPwds)

          this.updateLog(logId, {
            status: "completed",
            completedAt: Date.now(),
            touchedAccountIds: [...touchedAccountIds],
            counts: { parsed, new: newCount, duplicate },
            emailRun: {
              newestAt: summary.newestAt,
              cursorAt: summary.cursorAt,
              targetAt: summary.targetAt,
              scanned: summary.scanned,
              imported: summary.imported,
            },
          })
          return
        } catch (innerErr) {
          if (innerErr instanceof EmailPasswordError) {
            log.import('email sync needs password: logId=%s emailId=%s', logId, innerErr.emailId)
            // Update the log source with the real email ID so the UI can fetch it
            const existingLog = this.logRepo.get(logId)
            /* v8 ignore next -- in this handler the log is always a live email-source row */
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
            // Persist the password as soon as the user supplies it for a locked
            // email — so it survives even if the rest of the sweep later errors.
            this.appendPasswords([answer.password])
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
      /* v8 ignore next -- account always carries an id */
      if (account.id) {
        const settings = this.settingsRepo.query({ where: { authAccountId: account.id } })
        /* v8 ignore next -- the setting is created before the run, so it always exists */
        if (settings.length > 0) {
          this.settingsRepo.save({ ...settings[0], lastErrorLogId: logId })
        }
      }
    } finally {
      this.active.delete(logId)
      ctx.dispose()
    }
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
    this.notifications.notify({
      kind: "import-error",
      display: "error",
      title: "Import failed",
      body: error.message,
      ref: { type: "import-log", logId },
    })
  }

  /** Notify the user that a background email import is parked awaiting input. */
  private notifyNeedsInput(logId: string, account: AuthAccount & BaseEntity): void {
    this.notifications.notify({
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
    /* v8 ignore next -- updateLog callers always pass a live log id */
    if (!existing) return
    this.logRepo.save({ ...existing, ...patch })
  }

  /** Create one `importSource` row for an imported email/file, parented to its
   *  run. Returns the composite id to stamp onto that input's transactions. */
  private createSource(
    logId: string,
    descriptor: ImportSourceDescriptor,
    extra: Pick<ImportSource, "adapterId" | "accountId" | "counts">,
  ): string {
    return this.sourceRepo.save({
      importLogId: logId,
      importedAt: Date.now(),
      descriptor,
      adapterId: extra.adapterId,
      accountId: extra.accountId,
      counts: extra.counts,
    })
  }

  // ── Account creation ─────────────────────────────────

  private createAccount(result: FileImportResult): string {
    const statement = toAccountStatement(
      result.importData.statement,
      result.importData.transactions,
    )
    return this.accountRepo.save({
      kind: result.importData.kind,
      name: result.importData.bankId,
      currency: result.importData.account.currency,
      ...(statement && { statement }),
      bankId: result.importData.bankId,
      offeringId: result.importData.offeringId,
      metadata: buildMetadata(result.importData.account),
    })
  }

  private createAccountFromEmail(
    emailResult: EmailResult,
    account: AuthAccount & BaseEntity,
  ): string {
    const [bankId, offeringId] = emailResult.adapterId.split("/")
    const statement = toAccountStatement(emailResult.statement, emailResult.transactions)
    return this.accountRepo.save({
      kind: emailResult.kind,
      name: bankId || account.email,
      currency: emailResult.accountDetails.currency,
      ...(statement && { statement }),
      bankId,
      ...(offeringId && { offeringId }),
      metadata: buildMetadata(emailResult.accountDetails),
    })
  }

  /**
   * Resolve the MoneyAccount for an email result, creating it only when no
   * match exists. Accounts are created lazily at commit time, so two emails
   * from the same account both arrive with `accountId: ""`; re-querying here
   * (the repo's in-memory store reflects a `save` synchronously) lets the
   * second email reuse the account the first one just created instead of
   * spawning a duplicate.
   */
  private resolveOrCreateEmailAccount(
    emailResult: EmailResult,
    account: AuthAccount & BaseEntity,
  ): string {
    const [bankId] = emailResult.adapterId.split("/")
    const matches = findMatchingAccounts(this.accountRepo.query(), bankId, emailResult.kind, emailResult.accountDetails)
    if (matches.length > 0) {
      this.mergeAccountMetadata(matches[0].id, buildMetadata(emailResult.accountDetails))
      this.mergeAccountStatement(
        matches[0].id,
        toAccountStatement(emailResult.statement, emailResult.transactions),
      )
      return matches[0].id
    }
    return this.createAccountFromEmail(emailResult, account)
  }

  /**
   * Fold freshly-parsed metadata into an existing account, unioning values per
   * key (least-masked first) and persisting only when something changed.
   */
  private mergeAccountMetadata(
    accountId: string,
    incoming: Record<string, readonly string[]>,
  ): void {
    const account = this.accountRepo.get(accountId)
    if (!account) return
    const { metadata, changed } = mergeMetadata(account.metadata, incoming)
    if (changed) this.accountRepo.save({ ...account, metadata })
  }

  /**
   * Latest-wins merge of a statement snapshot onto an existing account: store
   * `snapshot` only when there is no current snapshot or `snapshot.asOf` is
   * strictly newer than the stored one. Survives out-of-order email backfill
   * (an older statement imported later must not regress the balance).
   */
  private mergeAccountStatement(
    accountId: string,
    snapshot: AccountStatement | undefined,
  ): void {
    if (!snapshot) return
    const account = this.accountRepo.get(accountId)
    if (!account) return
    const existing = account.statement
    if (existing && existing.asOf >= snapshot.asOf) return
    this.accountRepo.save({ ...account, statement: snapshot })
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
    /* v8 ignore next -- the row was just saved, so the get always resolves */
    if (!created) throw new Error(`Failed to create email import setting for ${account.id}`)
    return created
  }
}

// ── Utilities ───────────────────────────────────────────

/**
 * Map an adapter `StatementSummary` (integer minor units) to the app's typed
 * `AccountStatement`, or `undefined` when no snapshot can be stored.
 *
 * - `balance` is required, so a snapshot is built only when `closingBalance`
 *   is defined; the credit-only extras carry through when present.
 * - `asOf` falls back to `max(tx.date)` of the import's transactions when the
 *   adapter omits it; with neither an `asOf` nor any transaction, no snapshot
 *   is stored (latest-wins has no anchor).
 */
function toAccountStatement(
  summary: import("@pai-app/adapters").StatementSummary | undefined,
  transactions: readonly { readonly date: number }[],
): AccountStatement | undefined {
  if (!summary || summary.closingBalance === undefined) return undefined
  const asOf =
    summary.asOf ??
    (transactions.length > 0
      ? transactions.reduce((max, t) => (t.date > max ? t.date : max), transactions[0].date)
      : undefined)
  if (asOf === undefined) return undefined
  return {
    asOf,
    balance: summary.closingBalance,
    ...(summary.available !== undefined && { available: summary.available }),
    ...(summary.creditLimit !== undefined && { creditLimit: summary.creditLimit }),
    ...(summary.minimumDue !== undefined && { minimumDue: summary.minimumDue }),
    ...(summary.dueDate !== undefined && { dueDate: summary.dueDate }),
  }
}

function buildMetadata(
  account: import("@pai-app/adapters").AccountDetails,
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

function isParseError(err: Error): err is import("@pai-app/adapters").ParseError {
  return err.name === "ParseError" && "kind" in err
}

function classifyErrorKind(err: Error): string {
  if (isParseError(err)) return err.kind
  const msg = err.message.toLowerCase()
  if (msg.includes("refresh") || msg.includes("token") || msg.includes("401") || msg.includes("unauthorized")) return "auth"
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) return "network"
  return "unknown"
}
