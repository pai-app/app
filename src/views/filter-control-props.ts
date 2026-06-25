import type { FilterState } from "./filter-state"

/** Which surface a filter control is rendering inside. */
export type FilterVariant = "bar" | "sheet"

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
