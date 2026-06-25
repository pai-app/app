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
