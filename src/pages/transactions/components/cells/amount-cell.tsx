import { Money } from "@/ui/money"
import { cn } from "@/lib/utils"
import type { TransactionCellProps } from "./types"

/**
 * Transaction amount in the old-app style — a muted sign icon, the currency
 * icon, then the locale-grouped number. `font-light` matches the old app's
 * thin amount treatment. The cell owns its table-vs-card scale via `variant`.
 * Wraps the scalar `Money` primitive.
 */
export function AmountCell({ tx, variant = "table", className }: TransactionCellProps) {
  return (
    <Money
      amount={tx.amount}
      variant="icon"
      className={cn("font-light", variant === "card" ? "text-3xl" : "text-xl", className)}
    />
  )
}
