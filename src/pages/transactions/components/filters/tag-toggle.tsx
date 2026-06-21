import { Button } from "@/ui/button"
import { ButtonGroup } from "@/ui/button-group"
import { cn } from "@/lib/utils"
import type { FilterControlProps } from "./types"

/** Tagged / Untagged toggle. Clicking the active option clears it. */
export function TagToggle({ state, variant = "bar", className }: FilterControlProps) {
  const { filter, patch, untaggedCount } = state
  const value = filter.tag
  const toggle = (option: "tagged" | "untagged") => {
    patch({ tag: value === option ? null : option })
  }
  return (
    <ButtonGroup
      className={cn(
        "glass h-9 overflow-hidden rounded-full border",
        variant === "sheet" && "w-full *:flex-1",
        className,
      )}
    >
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
        {untaggedCount > 0 && (
          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-medium text-secondary-foreground tabular-nums">
            {untaggedCount}
          </span>
        )}
      </Button>
    </ButtonGroup>
  )
}
