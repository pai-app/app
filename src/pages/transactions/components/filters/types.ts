import type { ReactNode } from "react"
import type { UseTransactionsFilter } from "../../use-transactions-filter"

/** Which surface a filter control is rendering inside. */
export type FilterVariant = "bar" | "sheet"

/**
 * The shared contract every transaction filter implements: the whole filter
 * state object (filter values + `patch`/`clearAll` + derived counts) and an
 * optional surface hint. Each control reads and writes its own slice via
 * `state.filter` / `state.patch`, and owns its bar-vs-sheet presentation via
 * `variant` — so the bar and sheet stop hand-wiring slices and layout classes.
 */
export type FilterControlProps = {
  readonly state: UseTransactionsFilter
  readonly variant?: FilterVariant
  readonly className?: string
}

/** A filter control — a self-contained read/write over one slice of the filter. */
export type FilterControl = (props: FilterControlProps) => ReactNode
