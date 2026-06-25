import type { ReactNode } from "react"
import { Separator } from "@/ui/separator"
import { DateCell } from "./date-cell"
import { AmountCell } from "./amount-cell"
import { DescriptionCell } from "./description-cell"

export type TransactionCardRowProps = {
  readonly amount: number
  readonly date: number
  readonly title?: string | null
  readonly narration: string
  /** Resolved tag cell (interactive picker) — supplied by the feature container. */
  readonly tagCell: ReactNode
  /** Resolved account cell — supplied by the feature container. */
  readonly accountCell: ReactNode
  readonly onClick?: () => void
}

/** Mobile card row — description + date on top, amount + tag + account below. */
export function TransactionCardRow({
  amount,
  date,
  title,
  narration,
  tagCell,
  accountCell,
  onClick,
}: TransactionCardRowProps) {
  return (
    <div onClick={onClick} className="mx-4 flex flex-col rounded-xl border">
      <div className="flex flex-row items-center justify-between gap-3 px-3 py-1">
        <div className="min-w-0 flex-1"><DescriptionCell title={title} narration={narration} /></div>
        <div className="shrink-0"><DateCell date={date} /></div>
      </div>
      <Separator />
      <div className="flex flex-row items-center justify-between gap-3 p-3">
        <AmountCell amount={amount} variant="card" />
        <div className="flex flex-row items-center gap-3">
          {tagCell}
          {accountCell}
        </div>
      </div>
    </div>
  )
}
