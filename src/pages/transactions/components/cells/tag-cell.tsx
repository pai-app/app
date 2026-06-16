import type { ComponentProps } from "react"
import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { TagIcon } from "@/ui/tag-icon"
import { cn } from "@/lib/utils"
import { useEntity } from "@/providers/entity-provider"

export type TagCellProps = Omit<ComponentProps<typeof Button>, "children"> & {
  readonly tagId: string | null
  readonly autoTagged?: boolean
}

/**
 * Renders a transaction's tag — icon + name, or an "Add tag" affordance when
 * untagged. A `sparkles` glyph appears beside the tag name when the tag was
 * auto-applied (`autoTagged`). All remaining props (including the `ref`,
 * `onClick`, and ARIA attributes injected by a Radix `asChild` trigger) are
 * forwarded to the underlying `Button` so this can serve directly as a
 * `TagPicker` trigger.
 */
export function TagCell({ tagId, autoTagged, className, ...props }: TagCellProps) {
  const { tags } = useEntity()
  const tag = tagId ? tags.find((t) => t.id === tagId) : undefined

  return (
    <Button variant="secondary" size="sm" className={cn("m-0", className)} {...props}>
      {tag ? (
        <>
          <TagIcon tag={tag} />
          <span className="truncate">{tag.name}</span>
          {autoTagged && (
            <Icon name="sparkles" aria-hidden className="size-3 text-muted-foreground" />
          )}
        </>
      ) : (
        <>
          <Icon name="hash" className="text-muted-foreground" />
          <span className="text-muted-foreground">Add Tag</span>
        </>
      )}
    </Button>
  )
}
