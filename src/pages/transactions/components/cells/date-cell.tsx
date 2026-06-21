import { cn } from "@/lib/utils"
import type { TransactionCellProps } from "./types"

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
})

/** Compact transaction date — "MMM DD". UTC to align with monthly partitions. */
export function DateCell({ tx, className }: TransactionCellProps) {
  return <span className={cn("text-sm", className)}>{DATE_FMT.format(tx.transactionAt)}</span>
}
