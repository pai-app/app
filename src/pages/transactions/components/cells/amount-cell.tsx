import { Money } from "@/ui/money"
import { cn } from "@/lib/utils"

export type AmountCellProps = {
  readonly amount: number
  readonly className?: string
}

/**
 * Transaction amount in the old-app style — a muted sign icon, the currency
 * icon, then the locale-grouped number. `font-light` matches the old app's
 * thin amount treatment (proportional figures, as in the old app).
 */
export function AmountCell({ amount, className }: AmountCellProps) {
  return (
    <Money amount={amount} variant="icon" className={cn("font-light", className)} />
  )
}
