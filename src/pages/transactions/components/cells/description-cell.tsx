import { cn } from "@/lib/utils"
import type { TransactionRow } from "../../use-transactions-query"

export type DescriptionCellProps = {
  readonly tx: TransactionRow
  readonly className?: string
}

/**
 * Transaction description — the user-set `title`, falling back to the raw
 * `narration` (rendered muted, matching the old app's placeholder treatment).
 * Read-only here; inline editing lands in the editing workstream.
 */
export function DescriptionCell({ tx, className }: DescriptionCellProps) {
  const title = tx.title?.trim()
  const text = title || tx.narration
  return (
    <span className={cn("block truncate text-left", !title && "text-muted-foreground", className)}>
      {text}
    </span>
  )
}
