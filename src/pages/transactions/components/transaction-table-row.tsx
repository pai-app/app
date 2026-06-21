import { Icon } from "@/ui/icon"
import { cn } from "@/lib/utils"
import type { TransactionRow } from "../use-transactions-query"
import { DateCell } from "./cells/date-cell"
import { AmountCell } from "./cells/amount-cell"
import { DescriptionCell } from "./cells/description-cell"
import { TagPickerCell } from "./cells/tag-picker-cell"
import { AccountCell } from "./cells/account-cell"

export type TransactionTableRowProps = {
  readonly tx: TransactionRow
  readonly first: boolean
  readonly last: boolean
  readonly selected?: boolean
  readonly onClick?: () => void
}

/** Desktop table row — columnar layout matching the virtualizer row height. */
export function TransactionTableRow({ tx, first, last, selected, onClick }: TransactionTableRowProps) {
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
      <div className="w-20"><DateCell tx={tx} variant="table" /></div>
      <div className="w-40"><AmountCell tx={tx} variant="table" /></div>
      <div className="min-w-0 flex-1"><DescriptionCell tx={tx} variant="table" /></div>
      <div className="w-48"><TagPickerCell tx={tx} variant="table" /></div>
      <div className="flex w-36 flex-row items-center justify-between">
        <AccountCell tx={tx} variant="table" />
        {selected && <Icon name="chevron-right" className="mr-4 text-muted-foreground" />}
      </div>
    </div>
  )
}
