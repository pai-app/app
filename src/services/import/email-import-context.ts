import { parseEmail, ParseError } from "@fin-app/adapters"
import type { ImportData } from "@fin-app/adapters"
import type { BaseEntity } from "@strata/core"
import type { Repository } from "@strata/core"
import { searchEmails, fetchFullEmail } from "@/services/gmail"
import { searchOutlookEmails, fetchFullOutlookEmail } from "@/services/outlook"
import type { AuthAccount } from "@/services/entities/auth-account"
import type { MoneyAccount } from "@/services/entities/money-account"
import type { Transaction } from "@/services/entities/transaction"
import type { EmailImportState, EmailImportCursor } from "@/services/entities/email-import-setting"
import { ImportContext } from "./import-context"
import { CancelledError, throwIfCancelled, findMatchingAccounts, hashAndDedup, EmailPasswordError } from "./import-utils"
import type { HashedTransaction } from "./import-utils"

// ── Result ──────────────────────────────────────────────

export type EmailImportResult = {
  readonly processedEmails: ReadonlyArray<EmailResult>
  readonly state: EmailImportState
  readonly windowStart: number
  readonly windowEnd: number
  readonly readEmailCount: number
  readonly importedEmailCount: number
}

export type EmailResult = {
  readonly emailId: string
  readonly from: string
  readonly subject: string
  readonly date: number
  readonly adapterId: string
  readonly accountId: string
  readonly newAccount: boolean
  readonly transactions: ReadonlyArray<HashedTransaction>
  readonly newCount: number
  readonly duplicateCount: number
}

// ── Runner ──────────────────────────────────────────────

/**
 * Run an email sync for a connected account. Scans emails using the
 * sliding-window state (currentPoint/endPoint) from
 * `EmailImportSetting.importState`. Auto-commits — no confirm prompt.
 *
 * Ported from old `EmailImportProcessContext` + `ImportService.processEmails`.
 */
export async function runEmailImport(
  ctx: ImportContext,
  account: AuthAccount & BaseEntity,
  state: EmailImportState,
  filePasswords: readonly string[],
  accountRepo: Repository<MoneyAccount>,
  transactionRepo: Repository<Transaction>,
): Promise<EmailImportResult> {
  ctx.status = "in_progress"

  const results: EmailResult[] = []
  let readEmailCount = 0
  let importedEmailCount = 0
  let windowStart = Date.now()
  let windowEnd = state.endPoint?.date ?? 0

  // Determine date bounds for the search query
  const afterDate = state.endPoint?.date
    ? formatDateParam(state.endPoint.date)
    : undefined

  // Search for statement emails
  const emails = account.provider === "microsoft"
    ? await searchOutlookEmails(account, "statement", afterDate, undefined)
    : await searchEmails(account, "statement", afterDate, undefined)

  throwIfCancelled(ctx)

  if (emails.length === 0) {
    return {
      processedEmails: [],
      state: { ...state, lastImportAt: Date.now() },
      windowStart,
      windowEnd,
      readEmailCount: 0,
      importedEmailCount: 0,
    }
  }

  // Track the scan window
  windowStart = emails[0].date.getTime()
  const oldest = emails[emails.length - 1]
  if (!windowEnd || oldest.date.getTime() < windowEnd) {
    windowEnd = oldest.date.getTime()
  }

  // Filter out already-scanned emails
  const newEmails = filterNewEmails(emails, state)

  for (const email of newEmails) {
    throwIfCancelled(ctx)
    readEmailCount++

    try {
      const fullEmail = account.provider === "microsoft"
        ? await fetchFullOutlookEmail(account, email.id)
        : await fetchFullEmail(account, email.id)

      throwIfCancelled(ctx)

      const data = await parseEmail(fullEmail, filePasswords)
      if (!data) continue

      throwIfCancelled(ctx)

      const adapterId = `${data.bankId}/${data.offeringId}`
      const accountId = resolveAccountSync(data, accountRepo)
      const hashed = hashAndDedup(data, accountId, transactionRepo)

      const newCount = hashed.filter((t) => t.isNew).length
      const duplicateCount = hashed.length - newCount
      importedEmailCount++

      results.push({
        emailId: fullEmail.id,
        from: fullEmail.from,
        subject: fullEmail.subject,
        date: fullEmail.date,
        adapterId,
        accountId,
        newAccount: accountId === "",
        transactions: hashed,
        newCount,
        duplicateCount,
      })
    } catch (err) {
      if (err instanceof CancelledError) throw err
      if (err instanceof ParseError && err.kind === "password-required") {
        throw new EmailPasswordError(email.id, err)
      }
      // Skip unreadable emails (parse failures, network errors)
      continue
    }
  }

  // Advance sliding window
  const newCurrentPoint: EmailImportCursor | undefined =
    newEmails.length > 0
      ? { date: newEmails[0].date.getTime(), emailId: newEmails[0].id }
      : state.currentPoint

  const newEndPoint: EmailImportCursor | undefined =
    state.endPoint ?? (newEmails.length > 0
      ? { date: newEmails[newEmails.length - 1].date.getTime(), emailId: newEmails[newEmails.length - 1].id }
      : undefined)

  const newState: EmailImportState = {
    currentPoint: newCurrentPoint,
    endPoint: newEndPoint,
    lastImportAt: Date.now(),
  }

  return {
    processedEmails: results,
    state: newState,
    windowStart,
    windowEnd,
    readEmailCount,
    importedEmailCount,
  }
}

// ── Helpers ─────────────────────────────────────────────

type EmailSummary = { readonly id: string; readonly date: Date }

function filterNewEmails(
  emails: ReadonlyArray<EmailSummary>,
  state: EmailImportState,
): EmailSummary[] {
  if (!state.currentPoint) return [...emails]
  const cp = state.currentPoint
  return emails.filter((e) => {
    if (e.date.getTime() > cp.date) return true
    if (e.date.getTime() === cp.date && e.id !== cp.emailId) return true
    return false
  })
}

function resolveAccountSync(
  data: ImportData,
  accountRepo: Repository<MoneyAccount>,
): string {
  const all = accountRepo.query()
  const matches = findMatchingAccounts(all, data)
  if (matches.length === 1) return matches[0].id
  return matches.length === 0 ? "" : matches[0].id
}

function formatDateParam(epochMs: number): string {
  const d = new Date(epochMs)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}
