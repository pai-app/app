import { parseEmail, ParseError, statementEmailDomains } from "@pai-app/adapters"
import type { AccountDetails, AccountKind, StatementSummary } from "@pai-app/adapters"
import type { BaseEntity } from "@fyre-db/core"
import type { RepositoryType as Repository } from "@fyre-db/core"
import { getMailProvider } from "@/services/mail"
import type { EmailSummary, MailCursor, MailQuery } from "@/services/mail"
import type { AuthAccount } from "@/services/entities/auth-account"
import type { Transaction } from "@/services/entities/transaction"
import type { EmailImportState, EmailImportCursor } from "@/services/entities/email-import-setting"
import { ImportContext } from "./import-context"
import { CancelledError, throwIfCancelled, hashAndDedup, EmailPasswordError } from "./import-utils"
import type { HashedTransaction } from "./import-utils"

// ── Tuning ──────────────────────────────────────────────

/** Politeness delay between provider pages to avoid throttling during backfill. */
const PAGE_DELAY_MS = 400

/** Server-side filter for statement emails — the union of every registered
 *  bank's email domains (same pre-filter `parseEmail` applies to `email.from`).
 *  Falls back to a subject match when no bank declares domains. */
function statementQuery(): MailQuery {
  const domains = statementEmailDomains()
  return domains.length > 0 ? { domains } : { subject: "statement" }
}

// ── Result ──────────────────────────────────────────────

/** Per-email parse result. Account resolution + persistence happen at commit
 *  time (the `commitEmail` hook), so no `accountId` is carried here. */
export type EmailResult = {
  readonly emailId: string
  readonly from: string
  readonly subject: string
  readonly date: number
  readonly adapterId: string
  readonly kind: AccountKind
  readonly accountDetails: AccountDetails
  readonly statement?: StatementSummary
  readonly transactions: ReadonlyArray<HashedTransaction>
  readonly newCount: number
  readonly duplicateCount: number
}

/** Live time-progress for the sweep, reported once per page. The cursor walks
 *  newest → oldest, so `cursorAt` decreases from `newestAt` toward `targetAt`
 *  (absent during the first full backfill → indeterminate bar). */
export type EmailRunProgress = {
  readonly newestAt: number          // run's newest email (0% anchor)
  readonly cursorAt: number          // checkpoint reached so far (live fill)
  readonly targetAt?: number         // window floor (100% anchor), if known
  readonly scanned: number           // emails read so far
  readonly imported: number          // emails that produced data
  readonly currentFrom?: string      // sender of the page in flight
}

/** Run-level totals for the import log. Same shape as the last progress tick,
 *  minus the transient `currentFrom`. */
export type EmailRunSummary = Omit<EmailRunProgress, "currentFrom">

/** Side-effects the sweep delegates to the caller, in order: each email is
 *  committed *before* its checkpoint is saved, so an interrupted run never
 *  advances past un-persisted data. */
export type EmailRunHooks = {
  /** Persist one email's account + transactions. */
  readonly commitEmail: (result: EmailResult) => void
  /** Persist the sweep checkpoint state. */
  readonly saveState: (state: EmailImportState) => void
  /** Report live time-progress once per page (for the import-log surface). */
  readonly reportProgress: (progress: EmailRunProgress) => void
}

// ── Runner ──────────────────────────────────────────────

/**
 * Sweep a mailbox for statement emails, newest → oldest, with checkpoints.
 *
 * - **Backfill** (no `endPoint`): paginate to the oldest email.
 * - **Incremental** (with `endPoint`): stop at the previous high-water mark.
 * - **Resumable**: `currentPoint` is checkpointed after every email; an
 *   interrupted run continues from there. `startPoint` records the run's
 *   newest email and becomes the next `endPoint` only when the sweep drains.
 *
 * See `docs/email-import-windowing.md` for the full design.
 */
export async function runEmailImport(
  ctx: ImportContext,
  account: AuthAccount & BaseEntity,
  initialState: EmailImportState,
  filePasswords: readonly string[],
  transactionRepo: Repository<Transaction>,
  hooks: EmailRunHooks,
): Promise<EmailRunSummary> {
  ctx.status = "in_progress"
  const provider = getMailProvider(account)
  const query = statementQuery()

  let state = initialState
  let scanned = 0
  let imported = 0
  // The newest email of the run anchors 0%. Backfill has no known floor
  // (`targetAt` undefined → indeterminate); incremental stops at `endPoint`.
  let newestAt = state.startPoint?.date ?? 0
  const targetAt = state.endPoint?.date
  let cursorAt = state.currentPoint?.date ?? newestAt

  // First fetch of a resumed run is bounded by the checkpoint; later pages
  // follow the provider's page token.
  let before: MailCursor | undefined = toMailCursor(state.currentPoint)
  let pageToken: string | undefined

  for (;;) {
    throwIfCancelled(ctx)
    const page = await provider.listMessages({ query, before, pageToken })
    pageToken = page.nextPageToken
    let messages = [...page.messages]
    if (messages.length === 0) break

    // First page of a fresh run — capture the run's newest email.
    if (!state.startPoint) {
      const top = toCursor(messages[0])
      state = { ...state, startPoint: top, currentPoint: top }
      newestAt = top.date
      cursorAt = top.date
      hooks.saveState(state)
    }

    // Resume: drop emails at/newer than the checkpoint (already processed).
    if (before && state.currentPoint) {
      messages = sliceAfterCursor(messages, state.currentPoint)
    }
    before = undefined

    // Incremental: stop at the previous completed run's high-water mark.
    if (state.endPoint) {
      const idx = indexOfCursor(messages, state.endPoint)
      if (idx >= 0) {
        messages = messages.slice(0, idx)
        pageToken = undefined
      }
    }

    let currentFrom: string | undefined
    for (const email of messages) {
      throwIfCancelled(ctx)
      scanned++
      currentFrom = email.from
      try {
        const result = await buildEmailResult(provider, email, filePasswords, transactionRepo)
        if (result) {
          hooks.commitEmail(result)            // persist BEFORE checkpoint
          imported++
        }
      } catch (err) {
        if (err instanceof CancelledError) throw err
        if (err instanceof ParseError && err.kind === "password-required") {
          throw new EmailPasswordError(email.id, err)
        }
        // Skip unreadable emails (parse / network failures).
      }
      cursorAt = email.date
      state = { ...state, currentPoint: toCursor(email), lastImportAt: Date.now() }
      hooks.saveState(state)                    // checkpoint
    }

    // One progress tick per page (after its emails are checkpointed).
    hooks.reportProgress({ newestAt, cursorAt, targetAt, scanned, imported, currentFrom })

    if (!pageToken) break
    await delay(PAGE_DELAY_MS)
  }

  // Completion barrier — promote the run's top to the high-water mark.
  hooks.saveState({
    endPoint: state.startPoint ?? state.endPoint,
    startPoint: undefined,
    currentPoint: undefined,
    lastImportAt: Date.now(),
  })

  return {
    newestAt: newestAt || Date.now(),
    cursorAt,
    targetAt,
    scanned,
    imported,
  }
}

// ── Helpers ─────────────────────────────────────────────

async function buildEmailResult(
  provider: ReturnType<typeof getMailProvider>,
  email: EmailSummary,
  filePasswords: readonly string[],
  transactionRepo: Repository<Transaction>,
): Promise<EmailResult | null> {
  const fullEmail = await provider.fetchMessage(email.id)
  const data = await parseEmail(fullEmail, filePasswords)
  if (!data) return null

  const hashed = hashAndDedup(data, transactionRepo)
  const newCount = hashed.filter((t) => t.isNew).length

  return {
    emailId: fullEmail.id,
    from: fullEmail.from,
    subject: fullEmail.subject,
    date: fullEmail.date,
    adapterId: `${data.bankId}/${data.offeringId}`,
    kind: data.kind,
    accountDetails: data.account,
    statement: data.statement,
    transactions: hashed,
    newCount,
    duplicateCount: hashed.length - newCount,
  }
}

function toCursor(email: EmailSummary): EmailImportCursor {
  return { date: email.date, emailId: email.id }
}

function toMailCursor(cursor: EmailImportCursor | undefined): MailCursor | undefined {
  return cursor ? { date: cursor.date, id: cursor.emailId ?? "" } : undefined
}

/** Drop emails at/newer than `cursor` — keep only those after it (older). */
function sliceAfterCursor(
  emails: ReadonlyArray<EmailSummary>,
  cursor: EmailImportCursor,
): EmailSummary[] {
  const idx = indexOfCursor(emails, cursor)
  if (idx >= 0) return emails.slice(idx + 1)
  return emails.filter((e) => e.date < cursor.date)
}

function indexOfCursor(
  emails: ReadonlyArray<EmailSummary>,
  cursor: EmailImportCursor,
): number {
  return emails.findIndex((e) => e.id === cursor.emailId)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
