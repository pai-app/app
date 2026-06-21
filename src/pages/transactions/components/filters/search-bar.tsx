import { useState } from "react"
import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { Input } from "@/ui/input"
import { cn } from "@/lib/utils"
import type { FilterControlProps } from "./types"

export type SearchBarProps = FilterControlProps & {
  readonly autoFocus?: boolean
  /** Mobile: start collapsed to an icon, expand inline on tap. */
  readonly collapsible?: boolean
}

/**
 * Search input with a leading icon and a clear affordance. On mobile it can
 * start collapsed (icon-only) and expand inline when tapped.
 */
export function SearchBar({ state, variant = "bar", className, autoFocus, collapsible }: SearchBarProps) {
  const { filter, patch } = state
  const value = filter.search
  const onChange = (next: string) => { patch({ search: next }) }
  const [expanded, setExpanded] = useState(!collapsible)
  const widthClass = variant === "sheet" ? "flex-1" : "w-56"

  if (collapsible && !expanded && value === "") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("glass size-9 shrink-0 rounded-full border border-border", className)}
        onClick={() => { setExpanded(true) }}
        aria-label="Search"
      >
        <Icon name="search" />
      </Button>
    )
  }

  return (
    <div className={cn("glass relative h-9 rounded-full border border-border", widthClass, collapsible && "min-w-0 flex-1", className)}>
      <Icon
        name="search"
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        autoFocus={autoFocus ?? collapsible}
        value={value}
        onChange={(e) => { onChange(e.target.value) }}
        onBlur={() => { if (collapsible && value === "") setExpanded(false) }}
        placeholder="Search…"
        className="h-full rounded-full border-0 bg-transparent px-7 focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => { onChange("") }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <Icon name="x" className="size-3.5" />
        </button>
      )}
    </div>
  )
}
