import type { ReactNode } from "react"
import { Icon } from "@/ui/icon"
import { cn } from "@/lib/utils"
import { DateCell } from "./date-cell"
import { AmountCell } from "./amount-cell"
import { DescriptionCell } from "./description-cell"

export type TransactionTableRowProps = {
  readonly amount: number
  readonly date: number
  readonly title?: string | null
  readonly narration: string
  /** Resolved tag cell (interactive picker) — supplied by the feature container. */
  readonly tagCell: ReactNode
  /** Resolved account cell — supplied by the feature container. */
  readonly accountCell: ReactNode
  readonly first: boolean
  readonly last: boolean
  readonly selected?: boolean
  readonly onClick?: () => void
}

/** Desktop table row — columnar layout matching the virtualizer row height. */
export function TransactionTableRow({
  amount,
  date,
  title,
  narration,
  tagCell,
  accountCell,
  first,
  last,
  selected,
  onClick,
}: TransactionTableRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex h-full flex-row items-center gap-4 border-x border-b px-4 py-2 hover:bg-muted/50",
        first && "rounded-t-lg border-t",
        last && "rounded-b-lg",
        selected && "bg-secondary/80",
      )}
    >
      <div className="w-20"><DateCell date={date} /></div>
      <div className="w-40"><AmountCell amount={amount} variant="table" /></div>
      <div className="min-w-0 flex-1"><DescriptionCell title={title} narration={narration} /></div>
      <div className="w-48">{tagCell}</div>
      <div className="flex w-36 flex-row items-center justify-between">
        {accountCell}
        {selected && <Icon name="chevron-right" className="mr-4 text-muted-foreground" />}
      </div>
    </div>
  )
}
