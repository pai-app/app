import { cn } from "@/lib/utils"

export type DescriptionCellProps = {
  readonly title?: string | null
  readonly narration: string
  readonly className?: string
}

/**
 * Transaction description — the user-set `title`, falling back to the raw
 * `narration` (rendered muted, matching the old app's placeholder treatment).
 * Read-only here; inline editing lands in the editing workstream.
 */
export function DescriptionCell({ title, narration, className }: DescriptionCellProps) {
  const trimmed = title?.trim()
  const text = trimmed || narration
  return (
    <span className={cn("block truncate text-left", !trimmed && "text-muted-foreground", className)}>
      {text}
    </span>
  )
}
