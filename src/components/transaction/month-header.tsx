import { cn } from "@/lib/utils"
import type { RenderHeaderArgs } from "./transaction-virtualizer"

const MONTH_FMT = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

export type MonthHeaderProps = RenderHeaderArgs & {
  readonly isMobile: boolean
}

/**
 * Sticky section header for a month group. When `active` (pinned at the top of
 * the scroll viewport) the label and count gain a floating glass pill. On
 * mobile the row is inset to align with the transaction cards (`mx-4`).
 * Presentational: `isMobile` is injected by the caller.
 */
export function MonthHeader({ monthStart, count, active, isMobile }: MonthHeaderProps) {
  const pill = active && "glass rounded-full border px-4"
  return (
    <div className={cn("flex flex-row items-center justify-between py-1", isMobile && "px-4")}>
      <span className={cn("flex h-9 w-fit items-center font-semibold text-muted-foreground", pill)}>
        {MONTH_FMT.format(monthStart)}
      </span>
      <span className={cn("flex h-9 w-fit items-center text-sm text-muted-foreground", pill)}>
        {count} transaction{count !== 1 ? "s" : ""}
      </span>
    </div>
  )
}
