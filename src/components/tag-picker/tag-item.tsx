import type { TagView } from "@/views/tag-view"
import { cn } from "@/lib/utils"
import { Icon } from "@/ui/icon"
import { tagIconName } from "@/catalog/icon-resolve"
import { REMOVE_TAG_ID, type TagWithChildren } from "./types"

export type TagItemProps = {
  readonly tag: TagWithChildren
  readonly onSelect: (tag: TagView) => void
  readonly selectedTagId: string | null
}

/**
 * Single row in the picker — parent tag with an inline horizontal scroller of
 * its children. Renders the destructive style for the synthetic "Remove tag"
 * row and a highlighted state when a parent or child matches `selectedTagId`.
 */
export function TagItem({ tag, onSelect, selectedTagId }: TagItemProps) {
  const isRemove = tag.id === REMOVE_TAG_ID
  const isSelected = selectedTagId === tag.id

  return (
    <div
      className={cn(
        "flex flex-col gap-2 overflow-hidden rounded-xl p-2 hover:bg-accent/50 dark:hover:bg-background",
        isRemove && "text-destructive",
        isSelected && "border bg-accent/20",
      )}
    >
      <button
        type="button"
        className="flex w-full flex-row items-center gap-2 text-left"
        onClick={(e) => { e.stopPropagation(); onSelect(tag); }}
      >
        <Icon name={tagIconName(tag)} className="m-1 size-6 min-w-6" />
        <div className="flex flex-col">
          <span className="font-medium">{tag.name}</span>
          {tag.description && (
            <span className="text-sm text-muted-foreground">{tag.description}</span>
          )}
        </div>
      </button>
      {tag.children.length > 0 && (
        <div className="flex flex-row gap-1 overflow-x-auto scrollbar-none">
          {tag.children.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(child); }}
              className={cn(
                "flex flex-row items-center gap-1 whitespace-nowrap rounded-3xl p-2 hover:bg-muted",
                selectedTagId === child.id && "border bg-accent/20",
              )}
            >
              <Icon name={tagIconName(child)} className="size-6" />
              <span>{child.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
