import { Button } from "@/ui/button"
import { ButtonGroup } from "@/ui/button-group"
import { cn } from "@/lib/utils"
import type { TagFilter } from "../../use-transactions-filter"

export type TagToggleProps = {
  readonly value: TagFilter
  readonly onChange: (value: TagFilter) => void
  readonly className?: string
  readonly untaggedCount?: number
}

/** Tagged / Untagged toggle. Clicking the active option clears it. */
export function TagToggle({ value, onChange, className, untaggedCount }: TagToggleProps) {
  const toggle = (option: "tagged" | "untagged") => {
    onChange(value === option ? null : option)
  }
  return (
    <ButtonGroup className={cn("glass h-9 overflow-hidden rounded-full border", className)}>
      <Button
        className={cn("h-full", value !== "tagged" && "font-light")}
        variant={value === "tagged" ? "default" : "ghost"}
        onClick={() => { toggle("tagged") }}
      >
        Tagged
      </Button>
      <Button
        className={cn("h-full", value !== "untagged" && "font-light")}
        variant={value === "untagged" ? "default" : "ghost"}
        onClick={() => { toggle("untagged") }}
      >
        Untagged
        {untaggedCount !== undefined && untaggedCount > 0 && (
          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-medium text-secondary-foreground tabular-nums">
            {untaggedCount}
          </span>
        )}
      </Button>
    </ButtonGroup>
  )
}
