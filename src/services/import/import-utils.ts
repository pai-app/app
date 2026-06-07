import type { ImportData, AccountDetails } from "@fin-app/adapters"
import type { BaseEntity } from "@strata/core"
import type { MoneyAccount } from "@/services/entities/money-account"
import type { Transaction } from "@/services/entities/transaction"
import type { Repository } from "@strata/core"
import { ImportContext } from "./import-context"

// ── Hash ────────────────────────────────────────────────

export function computeHash(scope: string, date: number, amount: number, description: string): string {
  const raw = `${scope}|${date}|${amount}|${description}`
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
  data: ImportData,
): ReadonlyArray<MoneyAccount & BaseEntity> {
  return accounts.filter((acct) => {
    if (acct.bankId !== data.bankId) return false
    return matchesAccountDetails(acct, data.account)
  })
}

function matchesAccountDetails(
  acct: MoneyAccount & BaseEntity,
  details: AccountDetails,
): boolean {
  if (!acct.metadata || !details.accountNumber) return false
  // metadata values may not exist for the "accountNumber" key at runtime
  // even though the type is Record<string, readonly string[]>
  const acctNumbers = acct.metadata["accountNumber"] as readonly string[] | undefined
  if (!acctNumbers || acctNumbers.length === 0) return false
  return details.accountNumber.some((num) => acctNumbers.includes(num))
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
  accountId: string,
  transactionRepo: Repository<Transaction>,
): HashedTransaction[] {
  return data.transactions.map((tx) => {
    const hash = computeHash(accountId || data.bankId, tx.date, tx.amount, tx.description)
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
