import { cn } from "@/lib/utils"

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
})

export type DateCellProps = {
  readonly date: number
  readonly className?: string
}

/** Compact transaction date — "MMM DD". UTC to align with monthly partitions. */
export function DateCell({ date, className }: DateCellProps) {
  return <span className={cn("text-sm", className)}>{DATE_FMT.format(date)}</span>
}
