import type { ComponentProps } from "react"
import { TagCell as TagCellView } from "@/components/transaction/tag-cell"
import { Button } from "@/ui/button"
import { useObservable } from "@/providers/use-observable"
import { useServices } from "@/providers/services-provider"

export type TagCellProps = Omit<ComponentProps<typeof Button>, "children"> & {
  readonly tagId: string | null
  readonly autoTagged?: boolean
}

/**
 * Resolves a tag by id from the tags service and renders the presentational
 * `TagCell` view. All remaining props (including the `ref`, `onClick`, and ARIA
 * attributes injected by a Radix `asChild` trigger) are forwarded through to
 * the view's `Button`, so this can serve directly as a `TagPicker` trigger.
 */
export function TagCell({ tagId, autoTagged, ...props }: TagCellProps) {
  const tags = useObservable(useServices().tags.displayTags$)
  const tag = tagId ? tags.find((t) => t.id === tagId) : undefined
  return <TagCellView tag={tag} autoTagged={autoTagged} {...props} />
}
