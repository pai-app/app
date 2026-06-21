import type { ReactNode } from "react"
import type { TransactionRow } from "../../use-transactions-query"

/** Which row layout a transaction cell is rendering inside. */
export type TransactionCellVariant = "table" | "card"

/**
 * The shared contract every transaction cell implements: the full transaction
 * row, an optional layout hint, and a `className` passthrough. Cells own their
 * own table-vs-card presentation via `variant` so the row components don't
 * re-specify sizing. Cells that mutate read the single per-tenant
 * `TransactionsService` from the registry (`useServices().transactions`), never
 * from props.
 */
export type TransactionCellProps = {
  readonly tx: TransactionRow
  readonly variant?: TransactionCellVariant
  readonly className?: string
}

/** A transaction cell — a presentational component over a single row. */
export type TransactionCell = (props: TransactionCellProps) => ReactNode
