import type { ImportData, AccountDetails } from "@pai-app/adapters"
import type { BaseEntity } from "@fyre-db/core"
import type { MoneyAccount } from "@/entities/money-account"
import type { Transaction } from "@/entities/transaction"
import type { RepositoryType as Repository } from "@fyre-db/core"
import { ImportContext } from "./import-context"

// ── Hash ────────────────────────────────────────────────

export function computeHash(date: number, amount: number, description: string): string {
  const raw = `${date}|${amount}|${description}`
  let h = 0
  for (let i = 0; i < raw.length; i++) {
    h = Math.imul(31, h) + raw.charCodeAt(i) | 0
  }
  return (h >>> 0).toString(36)
}

export function monthKeyFromEpoch(epoch: number): string {
  const d = new Date(epoch)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

// ── Account matching ────────────────────────────────────

export function findMatchingAccounts(
  accounts: ReadonlyArray<MoneyAccount & BaseEntity>,
  bankId: string,
  kind: MoneyAccount["kind"],
  details: AccountDetails,
): ReadonlyArray<MoneyAccount & BaseEntity> {
  return accounts.filter((acct) => {
    if (acct.bankId !== bankId) return false
    // A bank can offer multiple products under one identifier (e.g. Paytm
    // wallet vs. savings sometimes share the same number), so the kind must
    // also match — otherwise a savings statement merges into the wallet.
    if (acct.kind !== kind) return false
    return matchesAccountDetails(acct, details)
  })
}

function matchesAccountDetails(
  acct: MoneyAccount & BaseEntity,
  details: AccountDetails,
): boolean {
  if (!details.accountNumber) return false
  // metadata values may not exist for the "accountNumber" key at runtime
  // even though the type is Record<string, readonly string[]>
  const acctNumbers = acct.metadata["accountNumber"] as readonly string[] | undefined
  if (!acctNumbers || acctNumbers.length === 0) return false
  return details.accountNumber.some((num) =>
    acctNumbers.some((existing) => accountNumbersMatch(existing, num)),
  )
}

/**
 * Whether two account-number strings refer to the same account, tolerating
 * masking. The same Jupiter account, for example, appears as a full number
 * (`77780100250237`) in app-download statements but masked (`XXXXX0237`) in
 * emailed ones. When at least one side is masked we fall back to comparing the
 * visible trailing digits (the only reliable shared signal); both fully visible
 * but unequal numbers are treated as different accounts.
 */
export function accountNumbersMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (!isMasked(a) && !isMasked(b)) return false

  const suffixA = visibleSuffix(a)
  const suffixB = visibleSuffix(b)
  // Require enough visible digits to make a confident match (avoid last-1/2 collisions).
  const MIN_VISIBLE = 4
  if (suffixA.length < MIN_VISIBLE || suffixB.length < MIN_VISIBLE) return false

  const digitsA = a.replace(/\D/g, "")
  const digitsB = b.replace(/\D/g, "")
  const shorter = suffixA.length <= suffixB.length ? suffixA : suffixB
  return digitsA.endsWith(shorter) && digitsB.endsWith(shorter)
}

/** A number is masked if it contains a mask character (X or *). */
function isMasked(num: string): boolean {
  return /[x*]/i.test(num)
}

/** The trailing run of visible digits, e.g. "XXXXX0237" → "0237". */
function visibleSuffix(num: string): string {
  return /(\d+)$/.exec(num)?.[1] ?? ""
}

// ── Metadata merge ──────────────────────────────────────

type Metadata = Record<string, readonly string[]>

/** Number of mask characters (X/x/*) in a value — fewer means more complete. */
function maskCount(value: string): number {
  return (value.match(/[x*]/gi) ?? []).length
}

/**
 * Order values so the most complete (fewest mask characters) come first, with
 * a stable secondary sort by descending length, then lexicographic. The first
 * element is therefore the "best" representation (e.g. a full account number
 * ahead of a masked one) — useful for display and exact matching.
 */
export function orderByCompleteness(values: readonly string[]): string[] {
  return [...values].sort((a, b) => {
    const byMask = maskCount(a) - maskCount(b)
    if (byMask !== 0) return byMask
    if (b.length !== a.length) return b.length - a.length
    return a.localeCompare(b)
  })
}

/**
 * Union two metadata records. For each key the values are concatenated,
 * de-duplicated, and reordered by completeness (least-masked first). Keys
 * present in only one side are carried over. Returns the merged record and
 * whether it differs from `existing` (so callers can skip no-op writes).
 *
 * Different statement formats for the same account contribute complementary
 * metadata (a full vs. masked account number, a SWIFT code one format omits),
 * so re-import accumulates rather than discarding.
 */
export function mergeMetadata(
  existing: Metadata,
  incoming: Metadata,
): { metadata: Metadata; changed: boolean } {
  const result: Record<string, readonly string[]> = {}
  let changed = false

  const keys = new Set([...Object.keys(existing), ...Object.keys(incoming)])
  for (const key of keys) {
    const before = existing[key] ?? []
    const add = incoming[key] ?? []
    const merged = orderByCompleteness([...new Set([...before, ...add])])
    result[key] = merged
    if (merged.length !== before.length || merged.some((v, i) => v !== before[i])) {
      changed = true
    }
  }

  return { metadata: result, changed }
}

// ── Transaction hashing + dedup ─────────────────────────

export type HashedTransaction = {
  readonly date: number
  readonly description: string
  readonly amount: number
  readonly hash: string
  readonly isNew: boolean
}

export function hashAndDedup(
  data: ImportData,
  transactionRepo: Repository<Transaction>,
): HashedTransaction[] {
  return data.transactions.map((tx) => {
    const hash = computeHash(tx.date, tx.amount, tx.description)
    const existing = transactionRepo.get(`transaction.${monthKeyFromEpoch(tx.date)}.${hash}`)
    return {
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      hash,
      isNew: !existing,
    }
  })
}

// ── Cancellation ────────────────────────────────────────

export class CancelledError extends Error {
  constructor() { super("Import cancelled") }
}

export function throwIfCancelled(ctx: ImportContext): void {
  if (ctx.isCancelled()) throw new CancelledError()
}

// ── Email password error with context ───────────────────

/** Wraps a password-required ParseError with the email ID that triggered it. */
export class EmailPasswordError extends Error {
  readonly emailId: string
  constructor(emailId: string, cause: Error) {
    super(cause.message, { cause })
    this.emailId = emailId
  }
}
