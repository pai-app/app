import { Separator } from "@/ui/separator"
import type { TransactionRow } from "../use-transactions-query"
import { DateCell } from "./cells/date-cell"
import { AmountCell } from "./cells/amount-cell"
import { DescriptionCell } from "./cells/description-cell"
import { TagPickerCell } from "./cells/tag-picker-cell"
import { AccountCell } from "./cells/account-cell"

export type TransactionCardRowProps = {
  readonly tx: TransactionRow
  readonly onClick?: () => void
}

/** Mobile card row — description + date on top, amount + tag + account below. */
export function TransactionCardRow({ tx, onClick }: TransactionCardRowProps) {
  return (
    <div onClick={onClick} className="mx-4 flex flex-col rounded-xl border">
      <div className="flex flex-row items-center justify-between gap-3 px-3 py-1">
        <div className="min-w-0 flex-1"><DescriptionCell tx={tx} /></div>
        <div className="shrink-0"><DateCell epochMs={tx.transactionAt} /></div>
      </div>
      <Separator />
      <div className="flex flex-row items-center justify-between gap-3 p-3">
        <div className="text-3xl"><AmountCell amount={tx.amount} /></div>
        <div className="flex flex-row items-center gap-3">
          <TagPickerCell tx={tx} />
          <AccountCell accountId={tx.accountId} />
        </div>
      </div>
    </div>
  )
}
