import { useEffect, type ReactNode } from "react"
import { AdaptiveSurface } from "@/components/adaptive-surface"
import { useApp } from "@/providers/app-provider"
import { type DisplayTag } from "@/providers/entity-provider"
import { loadPack } from "@/lib/icons/icon-loader"
import { log } from "@/log"
import { TagList } from "./tag-list"
import { useTagTree } from "./use-tag-tree"
import { REMOVE_TAG_ID } from "./types"

export type TagPickerProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly selectedTagId?: string | null
  readonly onSelect: (tag: DisplayTag | null) => void
  /** Trigger element. Wrapped via `asChild`, so it must accept ref + props. */
  readonly children: ReactNode
}

/**
 * Hierarchical tag picker.
 *
 * - **Desktop** — Popover anchored at the trigger
 * - **Mobile** — Bottom sheet
 *
 * Tags are sourced from `useTags()` (system + user, merged). Search
 * is debounced (300ms) and matches name + description as prefix tokens. When
 * `selectedTagId` is set, a "Remove tag" entry is prepended so the caller can
 * clear the selection.
 */
export function TagPicker({ open, onOpenChange, selectedTagId, onSelect, children }: TagPickerProps) {
  const { isMobile } = useApp()
  const { rows, query, onQueryChange } = useTagTree({
    selectedTagId,
    resetSignal: open,
  })

  // Warm the tag-icons pack so the loader's cache is populated in a single
  // chunk. Each `<TagIcon>` then renders synchronously instead of triggering
  // its own dynamic import.
  useEffect(() => {
    loadPack("tag-icons").catch((err: unknown) => {
      log.icons.warn("failed to load tag-icons pack: %o", err)
    })
  }, [])

  const handleSelect = (tag: DisplayTag) => {
    onSelect(tag.id === REMOVE_TAG_ID ? null : tag)
    onOpenChange(false)
  }

  const list = (
    <TagList
      rows={rows}
      query={query}
      onQueryChange={onQueryChange}
      onSelect={handleSelect}
      selectedTagId={selectedTagId ?? null}
      showCloseButton={isMobile}
    />
  )

  return (
    <AdaptiveSurface
      open={open}
      onOpenChange={onOpenChange}
      title="Select a tag"
      srOnlyTitle
      trigger={children}
      content={list}
      desktop={{
        type: "popover",
        props: {
          align: "start",
          side: "bottom",
          sideOffset: 4,
          className: "h-96 w-96 gap-0 overflow-hidden p-0",
        },
      }}
      mobile={{
        type: "sheet",
        props: {
          side: "bottom",
          showCloseButton: false,
          className: "h-[85vh] gap-0 p-0 data-[side=bottom]:h-[85vh]",
        },
      }}
    />
  )
}
