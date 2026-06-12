import { defineEntity } from "@fyre-db/core"
import { partitioned } from "@fyre-db/core"
import type { Money } from "./money"

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
  readonly title?: string                        // user-set label; falls back to narration
  readonly narration: string                     // raw imported text
  readonly transactionAt: number                 // ms epoch
  readonly amount: Money                         // sign = direction (signed minor units)
  readonly hash: string                          // dedup key
  /** Composite `importSource` id linking this transaction to the specific
   *  email/file it was imported from. The run is reachable transitively:
   *  `transaction → importSource → importLog`. Absent for manual entries. */
  readonly sourceId?: string
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
