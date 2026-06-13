import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { cn } from "@/lib/utils"

export type SortControlProps = {
  readonly sort: "asc" | "desc"
  readonly onChange: (sort: "asc" | "desc") => void
  readonly className?: string
}

/** Toggles the transaction sort between newest-first and oldest-first. */
export function SortControl({ sort, onChange, className }: SortControlProps) {
  const desc = sort === "desc"
  return (
    <Button
      variant="ghost"
      className={cn("glass h-9 rounded-full border border-border font-light", className)}
      onClick={() => { onChange(desc ? "asc" : "desc") }}
    >
      <Icon name={desc ? "arrow-down-wide-narrow" : "arrow-up-narrow-wide"} />
      {desc ? "Newest first" : "Oldest first"}
    </Button>
  )
}
