import type { TransactionFilter } from "./transaction-filter"

/**
 * The fyre-db-free read/write surface a filter control operates on. The full
 * `UseTransactionsFilter` (in the feature hook) extends this with the derived
 * `filtered` rows, which carry a fyre-db `BaseEntity` and so must stay in the
 * service/feature layers — keeping this contract pure lets presentational
 * controls in `components/` depend on it.
 */
export type FilterState = {
  readonly filter: TransactionFilter
  readonly patch: (partial: Partial<TransactionFilter>) => void
  readonly clearAll: () => void
  readonly activeCount: number
  readonly dirty: boolean
  readonly untaggedCount: number
}
