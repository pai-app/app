import { describe, it, expect, afterEach, vi } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../../helpers/test-fyredb"

// The parse/mail boundary is mocked: `runFileImport` / `runEmailImport` are the
// integration seams (PDF parsing, Gmail/Graph IO). Everything else in
// `ImportService` — log lifecycle, account resolve/create, source + transaction
// writes, dedup, init-sweep, notifications, resume, prompt relay — is exercised
// for real against an in-memory FyreDb.
const { runFileImportMock, runEmailImportMock } = vi.hoisted(() => ({
  runFileImportMock: vi.fn(),
  runEmailImportMock: vi.fn(),
}))
vi.mock("@/services/import/file-import-context", () => ({ runFileImport: runFileImportMock }))
vi.mock("@/services/import/email-import-context", () => ({ runEmailImport: runEmailImportMock }))

// Imported AFTER the mocks so the service binds the stubbed runners.
import { ImportService } from "@/services/import/import-service"
import { TransactionsService } from "@/services/transactions-service"
import { NotificationsService } from "@/services/notifications/notifications-service"
import {
  importLogEntity,
  importSourceEntity,
  importSourceMonthKey,
  transactionEntity,
  moneyAccountEntity,
  notificationEntity,
  authAccountEntity,
  emailImportSettingEntity,
  userSettingsEntity,
  type ImportLog,
  type ImportLogStatus,
  type MoneyAccount,
  type AuthAccount,
} from "@/services/entities"
import type { FileImportResult } from "@/services/import/file-import-context"
import type {
  EmailResult,
  EmailRunSummary,
  EmailRunHooks,
} from "@/services/import/email-import-context"
import type { HashedTransaction } from "@/services/import/import-utils"
import { CancelledError, EmailPasswordError } from "@/services/import/import-utils"
import { firstValueFrom } from "rxjs"

// ── Fixtures ────────────────────────────────────────────

const TX_DATE = Date.UTC(2026, 0, 15)
const TX_MONTH = "2026-01"

function hashedTx(over: Partial<HashedTransaction> & { hash: string }): HashedTransaction {
  return { date: TX_DATE, description: "ZOMATO ORDER", amount: -50000, isNew: true, ...over }
}

function fileResult(over: Partial<FileImportResult> = {}): FileImportResult {
  return {
    importData: {
      bankId: "hdfc",
      offeringId: "savings",
      kind: "bank",
      account: { currency: "INR", accountNumber: ["1234567890"] },
      transactions: [],
    },
    adapterId: "hdfc/savings",
    accountId: "",
    newAccount: true,
    transactions: [hashedTx({ hash: "h1" }), hashedTx({ hash: "h2", description: "SWIGGY" })],
    newCount: 2,
    duplicateCount: 0,
    newPasswords: [],
    ...over,
  }
}

function emailResult(over: Partial<EmailResult> = {}): EmailResult {
  return {
    emailId: "msg-1",
    from: "alerts@hdfcbank.net",
    subject: "Your account statement",
    date: TX_DATE,
    adapterId: "hdfc/savings",
    kind: "bank",
    accountDetails: { currency: "INR", accountNumber: ["1234567890"] },
    transactions: [hashedTx({ hash: "e1" })],
    newCount: 1,
    duplicateCount: 0,
    ...over,
  }
}

const SUMMARY: EmailRunSummary = { newestAt: 1, cursorAt: 1, scanned: 1, imported: 1 }

const EMAIL_ACCOUNT: AuthAccount = {
  provider: "google",
  feature: "email",
  userId: "user-1",
  email: "jane@example.com",
  name: "Jane Doe",
  picture: "https://example.com/jane.png",
  refreshToken: "secret-token",
}

/** Minimal `File` — the service only reads `name`/`type`/`size`; parsing is mocked. */
function fakeFile(name = "statement.pdf"): File {
  return { name, type: "application/pdf", size: 1234 } as unknown as File
}

const SOURCE_KEY = (): string => importSourceMonthKey(Date.now())

describe("ImportService", () => {
  let fyredb: FyreDb
  let svc: ImportService
  let transactions: TransactionsService
  let notifications: NotificationsService

  afterEach(async () => {
    svc.dispose()
    transactions.dispose()
    notifications.dispose()
    await fyredb.dispose().catch(() => {})
    vi.clearAllMocks()
  })

  /** Build db + real peers, but not the orchestrator (so a test can seed first). */
  async function setupDb(): Promise<void> {
    fyredb = await createTestFyreDb()
    transactions = new TransactionsService(fyredb)
    notifications = new NotificationsService(fyredb)
  }

  function makeService(): void {
    svc = new ImportService(fyredb, { transactions, notifications })
  }

  async function setup(): Promise<void> {
    await setupDb()
    makeService()
  }

  function seedAuthAccount(over: Partial<AuthAccount> = {}): string {
    return fyredb.repo(authAccountEntity).save({ ...EMAIL_ACCOUNT, ...over })
  }

  const waitForStatus = (logId: string, status: ImportLogStatus): Promise<void> =>
    vi.waitFor(() => {
      expect(fyredb.repo(importLogEntity).get(logId)?.status).toBe(status)
    })

  // ── File import ───────────────────────────────────────

  it("file import (new account): creates account, source, transactions, and updates the log", async () => {
    await setup()
    runFileImportMock.mockResolvedValue(fileResult())

    const logId = svc.startFileImport(fakeFile())
    await waitForStatus(logId, "completed")

    // A money account was created for the resolved bank.
    const accounts = fyredb.repo(moneyAccountEntity).query()
    expect(accounts).toHaveLength(1)
    const account = accounts[0]
    expect(account.bankId).toBe("hdfc")
    expect(account.offeringId).toBe("savings")
    expect(account.metadata["accountNumber"]).toEqual(["1234567890"])

    // One import-source row, parented to this run.
    const sources = fyredb.repo(importSourceEntity).query({ keys: [SOURCE_KEY()] })
    const source = sources.find((s) => s.importLogId === logId)
    expect(source).toBeDefined()
    expect(source?.descriptor.kind).toBe("file")
    expect(source?.accountId).toBe(account.id)
    expect(source?.counts).toEqual({ parsed: 2, new: 2, duplicate: 0 })

    // Two transactions written via the real transactions peer, stamped with the source.
    const txs = fyredb.repo(transactionEntity).query({ keys: [TX_MONTH] })
    expect(txs).toHaveLength(2)
    expect(txs.every((t) => t.sourceId === source?.id)).toBe(true)
    expect(txs.every((t) => t.accountId === account.id)).toBe(true)

    // Log aggregate updated.
    const logRow = fyredb.repo(importLogEntity).get(logId)
    expect(logRow?.adapterId).toBe("hdfc/savings")
    expect(logRow?.touchedAccountIds).toEqual([account.id])
    expect(logRow?.counts).toEqual({ parsed: 2, new: 2, duplicate: 0 })
    expect(logRow?.completedAt).toBeTypeOf("number")
  })

  it("file import (existing account): reuses the account and merges new metadata", async () => {
    await setup()
    const accountId = fyredb.repo(moneyAccountEntity).save({
      kind: "bank",
      name: "HDFC",
      currency: "INR",
      initialBalance: 0,
      bankId: "hdfc",
      offeringId: "savings",
      metadata: { accountNumber: ["1234567890"] },
    } satisfies MoneyAccount)

    runFileImportMock.mockResolvedValue(
      fileResult({
        accountId,
        newAccount: false,
        importData: {
          bankId: "hdfc",
          offeringId: "savings",
          kind: "bank",
          account: { currency: "INR", accountNumber: ["1234567890"], ifscCode: ["HDFC0001234"] },
          transactions: [],
        },
      }),
    )

    const logId = svc.startFileImport(fakeFile())
    await waitForStatus(logId, "completed")

    // No second account; the existing one gained the new metadata key.
    const accounts = fyredb.repo(moneyAccountEntity).query()
    expect(accounts).toHaveLength(1)
    expect(accounts[0].id).toBe(accountId)
    expect(accounts[0].metadata["ifscCode"]).toEqual(["HDFC0001234"])
    expect(accounts[0].metadata["accountNumber"]).toEqual(["1234567890"])
  })

  it("file import (zero new): writes no source row but still completes", async () => {
    await setup()
    runFileImportMock.mockResolvedValue(
      fileResult({
        transactions: [hashedTx({ hash: "dup", isNew: false })],
        newCount: 0,
        duplicateCount: 1,
      }),
    )

    const logId = svc.startFileImport(fakeFile())
    await waitForStatus(logId, "completed")

    const sources = fyredb.repo(importSourceEntity).query({ keys: [SOURCE_KEY()] })
    expect(sources.filter((s) => s.importLogId === logId)).toHaveLength(0)
    expect(fyredb.repo(transactionEntity).query({ keys: [TX_MONTH] })).toHaveLength(0)
    expect(fyredb.repo(importLogEntity).get(logId)?.counts).toEqual({ parsed: 1, new: 0, duplicate: 1 })
  })

  it("file import error: marks the log failed and spawns an import-error notification", async () => {
    await setup()
    runFileImportMock.mockRejectedValue(new Error("boom"))

    const logId = svc.startFileImport(fakeFile())
    await waitForStatus(logId, "failed")

    const logRow = fyredb.repo(importLogEntity).get(logId)
    expect(logRow?.error?.kind).toBe("unknown")
    expect(logRow?.error?.message).toBe("boom")

    const notes = fyredb.repo(notificationEntity).query()
    const importError = notes.find((n) => n.kind === "import-error")
    expect(importError).toBeDefined()
    expect(importError?.ref).toEqual({ type: "import-log", logId })
  })

  it("file import: appends newly-entered passwords to the vault", async () => {
    await setup()
    runFileImportMock.mockResolvedValue(fileResult({ newPasswords: ["hunter2"] }))

    const logId = svc.startFileImport(fakeFile())
    await waitForStatus(logId, "completed")

    expect(fyredb.repo(userSettingsEntity).get()?.filePasswords).toContain("hunter2")
  })

  // ── Email sync ────────────────────────────────────────

  it("startEmailSync: returns '' and creates no log for an unknown account", async () => {
    await setup()
    const logId = svc.startEmailSync("auth-account._.nope")
    expect(logId).toBe("")
    expect(fyredb.repo(importLogEntity).query()).toHaveLength(0)
  })

  it("startEmailSync: a second trigger while active returns the same log id", async () => {
    await setup()
    const accountId = seedAuthAccount()
    runEmailImportMock.mockReturnValue(new Promise<EmailRunSummary>(() => {})) // never settles

    const first = svc.startEmailSync(accountId)
    const second = svc.startEmailSync(accountId)

    expect(first).not.toBe("")
    expect(second).toBe(first)
    expect(svc.activeImportCount()).toBe(1)
  })

  it("email sync commit path: resolves the account, writes a source + transactions, completes", async () => {
    await setup()
    const accountId = seedAuthAccount()
    runEmailImportMock.mockImplementation(
      (_ctx: unknown, _account: unknown, _state: unknown, _pwds: unknown, _txRepo: unknown, hooks: EmailRunHooks) => {
        hooks.commitEmail(emailResult())
        return Promise.resolve<EmailRunSummary>(SUMMARY)
      },
    )

    const logId = svc.startEmailSync(accountId)
    await waitForStatus(logId, "completed")

    // Account lazily created from the email result.
    const accounts = fyredb.repo(moneyAccountEntity).query()
    expect(accounts).toHaveLength(1)
    expect(accounts[0].bankId).toBe("hdfc")

    // Email-kind source row + transactions.
    const sources = fyredb.repo(importSourceEntity).query({ keys: [SOURCE_KEY()] })
    const source = sources.find((s) => s.importLogId === logId)
    expect(source).toBeDefined()
    expect(source?.descriptor.kind).toBe("email")
    expect(fyredb.repo(transactionEntity).query({ keys: [TX_MONTH] })).toHaveLength(1)

    const logRow = fyredb.repo(importLogEntity).get(logId)
    expect(logRow?.touchedAccountIds).toEqual([accounts[0].id])
    expect(logRow?.emailRun?.scanned).toBe(1)
  })

  // ── Init sweep ────────────────────────────────────────

  it("init sweep: cancels stale in_progress and file needs_input logs from a prior session", async () => {
    await setupDb()
    const inProgressId = fyredb.repo(importLogEntity).save({
      trigger: "manual",
      triggeredAt: Date.now(),
      status: "in_progress",
      source: { kind: "file", fileName: "old.pdf" },
      touchedAccountIds: [],
      counts: { parsed: 0, new: 0, duplicate: 0 },
    } satisfies ImportLog)
    const needsInputId = fyredb.repo(importLogEntity).save({
      trigger: "manual",
      triggeredAt: Date.now(),
      status: "needs_input",
      source: { kind: "file", fileName: "locked.pdf" },
      touchedAccountIds: [],
      counts: { parsed: 0, new: 0, duplicate: 0 },
    } satisfies ImportLog)

    makeService() // constructor runs the init sweep

    for (const id of [inProgressId, needsInputId]) {
      const row = fyredb.repo(importLogEntity).get(id)
      expect(row?.status).toBe("cancelled")
      expect(row?.error?.kind).toBe("abandoned")
    }
  })

  // ── Prompt relay / lifecycle ──────────────────────────

  it("getContext / activeImportCount / cancel / dispose / answer behave on a live import", async () => {
    await setup()
    runFileImportMock.mockReturnValue(new Promise<FileImportResult>(() => {})) // stays in flight

    const logId = svc.startFileImport(fakeFile())
    expect(svc.getContext(logId)).toBeDefined()
    expect(svc.activeImportCount()).toBe(1)
    expect(svc.activeLogIds()).toContain(logId)

    expect(() => { svc.answer("unknown-log", { kind: "confirm", confirmed: true }) }).not.toThrow()
    expect(() => { svc.answer(logId, { kind: "confirm", confirmed: true }) }).not.toThrow() // relays to the live ctx
    expect(() => { svc.cancel(logId) }).not.toThrow()
    expect(() => { svc.cancel("unknown-log") }).not.toThrow()

    svc.dispose()
    expect(svc.activeImportCount()).toBe(0)
    expect(svc.getContext(logId)).toBeUndefined()
  })

  // ── Resume ────────────────────────────────────────────

  it("resume: revives a needs_input email log and re-invokes the email runner", async () => {
    await setup()
    const accountId = seedAuthAccount()
    runEmailImportMock.mockReturnValue(new Promise<EmailRunSummary>(() => {})) // keep it parked

    const logId = fyredb.repo(importLogEntity).save({
      trigger: "manual",
      triggeredAt: Date.now(),
      status: "needs_input",
      source: { kind: "email", authAccountId: accountId, emailId: "msg-9", receivedAt: TX_DATE, from: EMAIL_ACCOUNT.email, subject: "stmt" },
      touchedAccountIds: [],
      counts: { parsed: 0, new: 0, duplicate: 0 },
      prompt: { kind: "password" },
    } satisfies ImportLog)

    const resumed = svc.resume(logId)

    expect(resumed).toBe(logId)
    expect(runEmailImportMock).toHaveBeenCalledTimes(1)
    expect(svc.getContext(logId)).toBeDefined()
    const row = fyredb.repo(importLogEntity).get(logId)
    expect(row?.status).toBe("in_progress")
    expect(row?.prompt).toBeUndefined()
  })

  it("resume: returns null for missing, non-email, or non-resumable logs", async () => {
    await setup()
    expect(svc.resume("import-log._.missing")).toBeNull()

    const fileLogId = fyredb.repo(importLogEntity).save({
      trigger: "manual",
      triggeredAt: Date.now(),
      status: "needs_input",
      source: { kind: "file", fileName: "x.pdf" },
      touchedAccountIds: [],
      counts: { parsed: 0, new: 0, duplicate: 0 },
    } satisfies ImportLog)
    expect(svc.resume(fileLogId)).toBeNull()

    const completedId = fyredb.repo(importLogEntity).save({
      trigger: "manual",
      triggeredAt: Date.now(),
      status: "completed",
      source: { kind: "email", authAccountId: "a", emailId: "", receivedAt: 0, from: "x", subject: "" },
      touchedAccountIds: [],
      counts: { parsed: 0, new: 0, duplicate: 0 },
    } satisfies ImportLog)
    expect(svc.resume(completedId)).toBeNull()

    // needs_input email log whose auth account no longer exists.
    const orphanId = fyredb.repo(importLogEntity).save({
      trigger: "manual",
      triggeredAt: Date.now(),
      status: "needs_input",
      source: { kind: "email", authAccountId: "auth-account._.ghost", emailId: "", receivedAt: 0, from: "x", subject: "" },
      touchedAccountIds: [],
      counts: { parsed: 0, new: 0, duplicate: 0 },
    } satisfies ImportLog)
    expect(svc.resume(orphanId)).toBeNull()

    expect(runEmailImportMock).not.toHaveBeenCalled()
  })

  it("email sync: persists the import-setting cursor on saveState", async () => {
    await setup()
    const accountId = seedAuthAccount()
    runEmailImportMock.mockImplementation(
      (_ctx: unknown, _account: unknown, _state: unknown, _pwds: unknown, _txRepo: unknown, hooks: EmailRunHooks) => {
        hooks.saveState({ currentPoint: { date: TX_DATE } })
        return Promise.resolve<EmailRunSummary>(SUMMARY)
      },
    )

    const logId = svc.startEmailSync(accountId)
    await waitForStatus(logId, "completed")

    const setting = fyredb.repo(emailImportSettingEntity).query({ where: { authAccountId: accountId } })[0]
    expect(setting.importState.currentPoint?.date).toBe(TX_DATE)
  })

  it("email sync: reports per-page progress onto the log's emailRun snapshot", async () => {
    await setup()
    const accountId = seedAuthAccount()
    runEmailImportMock.mockImplementation(
      (_ctx: unknown, _account: unknown, _state: unknown, _pwds: unknown, _txRepo: unknown, hooks: EmailRunHooks) => {
        hooks.reportProgress({ newestAt: 100, cursorAt: 60, targetAt: 10, scanned: 3, imported: 1, currentFrom: "alerts@hdfcbank.net" })
        return Promise.resolve<EmailRunSummary>(SUMMARY)
      },
    )

    const logId = svc.startEmailSync(accountId)
    await waitForStatus(logId, "completed")
    // Final completion overwrites emailRun with the summary; the call merely
    // exercises the per-page reportProgress path (no throw, run completes).
    expect(fyredb.repo(importLogEntity).get(logId)?.emailRun?.scanned).toBe(SUMMARY.scanned)
  })

  it("email sync: a parsed email reuses a matching account and merges all metadata fields", async () => {
    await setup()
    const accountId = seedAuthAccount()
    const moneyId = fyredb.repo(moneyAccountEntity).save({
      kind: "bank",
      name: "HDFC",
      currency: "INR",
      initialBalance: 0,
      bankId: "hdfc",
      offeringId: "savings",
      metadata: { accountNumber: ["1234567890"] },
    } satisfies MoneyAccount)

    runEmailImportMock.mockImplementation(
      (_ctx: unknown, _account: unknown, _state: unknown, _pwds: unknown, _txRepo: unknown, hooks: EmailRunHooks) => {
        hooks.commitEmail(
          emailResult({
            accountDetails: {
              currency: "INR",
              accountNumber: ["1234567890"],
              ifscCode: ["HDFC0001234"],
              swiftCode: ["HDFCINBB"],
              micrCode: ["400240001"],
              customerId: ["CUST-9"],
              accountHolderName: ["Jane Doe"],
            },
          }),
        )
        return Promise.resolve<EmailRunSummary>(SUMMARY)
      },
    )

    const logId = svc.startEmailSync(accountId)
    await waitForStatus(logId, "completed")

    const accounts = fyredb.repo(moneyAccountEntity).query()
    expect(accounts).toHaveLength(1) // reused, not duplicated
    const merged = fyredb.repo(moneyAccountEntity).get(moneyId)
    expect(merged?.metadata["ifscCode"]).toEqual(["HDFC0001234"])
    expect(merged?.metadata["swiftCode"]).toEqual(["HDFCINBB"])
    expect(merged?.metadata["micrCode"]).toEqual(["400240001"])
    expect(merged?.metadata["customerId"]).toEqual(["CUST-9"])
    expect(merged?.metadata["accountHolderName"]).toEqual(["Jane Doe"])
  })

  it("email sync password loop: parks on needs_input, notifies, then resumes to completion on answer", async () => {
    await setup()
    const accountId = seedAuthAccount()
    let calls = 0
    runEmailImportMock.mockImplementation(
      (_ctx: unknown, _account: unknown, _state: unknown, _pwds: unknown, _txRepo: unknown, hooks: EmailRunHooks) => {
        calls += 1
        if (calls === 1) return Promise.reject(new EmailPasswordError("msg-locked", new Error("password required")))
        hooks.commitEmail(emailResult())
        return Promise.resolve<EmailRunSummary>(SUMMARY)
      },
    )

    const logId = svc.startEmailSync(accountId)
    await waitForStatus(logId, "needs_input")

    // The log source is stamped with the real email id and a notification fired.
    const parked = fyredb.repo(importLogEntity).get(logId)
    expect(parked?.source.kind === "email" && parked.source.emailId).toBe("msg-locked")
    expect(parked?.prompt).toEqual({ kind: "password" })
    expect(fyredb.repo(notificationEntity).query().some((n) => n.kind === "import-needs-input")).toBe(true)

    svc.answer(logId, { kind: "password", password: "letmein" })
    await waitForStatus(logId, "completed")

    expect(calls).toBe(2)
    expect(fyredb.repo(userSettingsEntity).get()?.filePasswords).toContain("letmein")
    expect(fyredb.repo(transactionEntity).query({ keys: [TX_MONTH] })).toHaveLength(1)
  })

  it("email sync error: marks the log failed and records lastErrorLogId on the setting", async () => {
    await setup()
    const accountId = seedAuthAccount()
    runEmailImportMock.mockRejectedValue(new Error("mailbox unreachable"))

    const logId = svc.startEmailSync(accountId)
    await waitForStatus(logId, "failed")

    const setting = fyredb.repo(emailImportSettingEntity).query({ where: { authAccountId: accountId } })[0]
    expect(setting.lastErrorLogId).toBe(logId)
    expect(fyredb.repo(notificationEntity).query().some((n) => n.kind === "import-error")).toBe(true)
  })

  it("import cancelled: a CancelledError marks the log cancelled without a notification", async () => {
    await setup()
    runFileImportMock.mockRejectedValue(new CancelledError())

    const logId = svc.startFileImport(fakeFile())
    await waitForStatus(logId, "cancelled")

    const logRow = fyredb.repo(importLogEntity).get(logId)
    expect(logRow?.completedAt).toBeTypeOf("number")
    expect(logRow?.error).toBeUndefined()
    expect(fyredb.repo(notificationEntity).query()).toHaveLength(0)
  })

  it("error classification: auth and network messages map to the right error kind", async () => {
    await setup()

    runFileImportMock.mockRejectedValueOnce(new Error("token refresh returned 401 unauthorized"))
    const authLog = svc.startFileImport(fakeFile())
    await waitForStatus(authLog, "failed")
    expect(fyredb.repo(importLogEntity).get(authLog)?.error?.kind).toBe("auth")

    runFileImportMock.mockRejectedValueOnce(new Error("network failed to fetch"))
    const netLog = svc.startFileImport(fakeFile())
    await waitForStatus(netLog, "failed")
    expect(fyredb.repo(importLogEntity).get(netLog)?.error?.kind).toBe("network")
  })

  it("observe* reactive reads project log rows and run sources", async () => {
    await setup()
    runFileImportMock.mockResolvedValue(fileResult())
    const logId = svc.startFileImport(fakeFile())
    await waitForStatus(logId, "completed")

    const logRow = fyredb.repo(importLogEntity).get(logId)
    expect(logRow).toBeDefined()
    if (!logRow) throw new Error("expected a log row")

    const observed = await firstValueFrom(svc.observeLog(logId))
    expect(observed?.id).toBe(logId)

    const monthKey = SOURCE_KEY()
    const logs = await firstValueFrom(svc.observeLogs([monthKey]))
    expect(logs.some((l) => l.id === logId)).toBe(true)

    const sources = await firstValueFrom(svc.observeSources(logRow))
    expect(sources.some((s) => s.importLogId === logId)).toBe(true)
  })
})
