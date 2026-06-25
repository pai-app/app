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
  /** `true` ⇒ this row's tag was auto-applied by the engine and is counted in
   *  the rule's `autoApplied` histogram; cleared on any human tag change/untag.
   *  Load-bearing discriminator used to rebuild rule strength. */
  readonly autoTagged?: boolean
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

/**
 * A persisted transaction as the UI consumes it — the domain fields plus the
 * stable `id`. The service's stored row (`Transaction & BaseEntity`) is a
 * superset, so it satisfies this without leaking fyre-db internals into the UI.
 */
export type TransactionRow = Transaction & { readonly id: string }
