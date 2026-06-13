import { Button } from "@/ui/button"
import { ButtonGroup } from "@/ui/button-group"
import { cn } from "@/lib/utils"
import type { TagFilter } from "../../use-transactions-filter"

export type TagToggleProps = {
  readonly value: TagFilter
  readonly onChange: (value: TagFilter) => void
  readonly className?: string
}

/** Tagged / Untagged toggle. Clicking the active option clears it. */
export function TagToggle({ value, onChange, className }: TagToggleProps) {
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
      </Button>
    </ButtonGroup>
  )
}
