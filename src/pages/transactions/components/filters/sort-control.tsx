import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { cn } from "@/lib/utils"
import type { FilterControlProps } from "./types"

/** Toggles the transaction sort between newest-first and oldest-first. */
export function SortControl({ state, variant = "bar", className }: FilterControlProps) {
  const { filter, patch } = state
  const desc = filter.sort === "desc"
  return (
    <Button
      variant="ghost"
      className={cn(
        "glass h-9 rounded-full border border-border font-light",
        variant === "sheet" && "w-full justify-start",
        className,
      )}
      onClick={() => { patch({ sort: desc ? "asc" : "desc" }) }}
    >
      <Icon name={desc ? "arrow-down-wide-narrow" : "arrow-up-narrow-wide"} />
      {desc ? "Newest first" : "Oldest first"}
    </Button>
  )
}
