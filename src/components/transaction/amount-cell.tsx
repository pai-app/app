import { Money } from "@/components/money"
import { cn } from "@/lib/utils"

export type AmountCellProps = {
  readonly amount: number
  readonly variant?: "table" | "card"
  readonly className?: string
}

/**
 * Transaction amount in the old-app style — a muted sign icon, the currency
 * icon, then the locale-grouped number. `font-light` matches the old app's
 * thin amount treatment. The cell owns its table-vs-card scale via `variant`.
 * Wraps the scalar `Money` primitive.
 */
export function AmountCell({ amount, variant = "table", className }: AmountCellProps) {
  return (
    <Money
      amount={amount}
      variant="icon"
      className={cn("font-light", variant === "card" ? "text-3xl" : "text-xl", className)}
    />
  )
}
