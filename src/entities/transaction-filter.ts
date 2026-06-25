/** Which surface a filter control is rendering inside. */
export type FilterVariant = "bar" | "sheet"

/** Tagged/untagged constraint, or `null` for "no tag filter". */
export type TagFilter = "tagged" | "untagged" | null

/**
 * Compound, unnamed transaction filter. Persisted per tenant to
 * `sessionStorage`. Amount bounds are **major units** in the tenant's default
 * currency and compared on the absolute value.
 */
export type TransactionFilter = {
  readonly sort: "asc" | "desc"
  readonly accountIds: readonly string[]   // empty = all
  readonly tag: TagFilter
  readonly amountMin?: number              // major units
  readonly amountMax?: number              // major units
  readonly search: string                  // narration/title substring OR exact amount
}

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

/**
 * The shared contract every transaction filter control implements: the filter
 * read/write surface plus an optional surface hint. Each control reads and
 * writes its own slice via `state.filter` / `state.patch`, and owns its
 * bar-vs-sheet presentation via `variant`.
 */
export type FilterControlProps = {
  readonly state: FilterState
  readonly variant?: FilterVariant
  readonly className?: string
}
