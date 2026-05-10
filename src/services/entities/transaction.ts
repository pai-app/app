import { defineEntity } from "@strata/core"
import { partitioned } from "@strata/core"
import type { Money } from "./money"

/**
 * Source of an imported transaction. Discriminated union — keep additive:
 * new variants (e.g. `'sms'`, `'manual'`) can be added without breaking
 * existing data.
 */
export type TransactionFileSource = {
  readonly type: "file"
  readonly fileName: string
  readonly fileType?: string
}

export type TransactionEmailSource = {
  readonly type: "email"
  readonly authAccountId: string
  readonly emailId: string
  readonly date: number             // ms epoch
  readonly from: string
  readonly to: string
  readonly subject: string
}

export type TransactionSource =
  | TransactionFileSource
  | TransactionEmailSource

/**
 * A single financial event. Partitioned monthly by `transactionAt` so a
 * tenant's data shards into one blob per month — keeps cold months out of
 * memory and limits sync churn.
 *
 * Transfers between own accounts are modelled as ordinary transactions
 * tagged with a synthetic `account-<accountId>` tag (parented to
 * `system-tag-selftransfer`). No separate `transferAccountId` field.
 *
 * Currency is intentionally absent — the account's currency wins. Add as
 * an optional override if/when multi-currency support lands.
 */
export type Transaction = {
  readonly accountId: string                     // → MoneyAccount.id
  readonly tagId?: string                        // → Tag.id (real or synthetic 'account-<id>')
  readonly title: string
  readonly narration?: string
  readonly transactionAt: number                 // ms epoch
  readonly amount: Money                         // sign = direction (signed minor units)
  readonly hash: string                          // dedup key
  readonly source?: TransactionSource
}

/** YYYY-MM partition key derived from the transaction date. */
function monthKey(t: Transaction): string {
  const d = new Date(t.transactionAt)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export const transactionEntity = defineEntity<Transaction>("transaction", {
  keyStrategy: partitioned<Transaction>(monthKey),
  // Use the hash as the entity id so importing the same statement twice
  // upserts the same row instead of creating duplicates. Manual entries
  // are responsible for supplying their own hash (e.g. uuid).
  deriveId: (t) => t.hash,
})
