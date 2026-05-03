import { useEffect, useState, type ReactNode } from "react"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { useApp } from "@/providers/app-provider"
import { type TagRow } from "@/providers/entity-provider"
import { loadPack } from "@/lib/icons/icon-loader"
import type { IconComponent } from "@/lib/icons"
import { log } from "@/log"
import { TagList } from "./tag-list"
import { useTagTree } from "./use-tag-tree"
import { REMOVE_TAG_ID } from "./types"

type IconMap = Readonly<Record<string, IconComponent>>

export type TagPickerProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly selectedTagId?: string | null
  readonly onSelect: (tag: TagRow | null) => void
  /** Trigger element. Wrapped via `asChild`, so it must accept ref + props. */
  readonly children: ReactNode
}

/**
 * Hierarchical tag picker.
 *
 * - **Desktop** — Popover anchored at the trigger
 * - **Mobile** — Bottom sheet
 *
 * Tags are sourced from `useSettings().tags` (system + user, merged). Search
 * is debounced (300ms) and matches name + description as prefix tokens. When
 * `selectedTagId` is set, a "Remove tag" entry is prepended so the caller can
 * clear the selection.
 */
export function TagPicker({ open, onOpenChange, selectedTagId, onSelect, children }: TagPickerProps) {
  const { isMobile } = useApp()
  const [icons, setIcons] = useState<IconMap | null>(null)
  const { rows, query, onQueryChange } = useTagTree({
    selectedTagId,
    resetSignal: open,
  })

  // Preload the tag-icons pack so all rows render synchronously from a map
  // instead of each `<Icon>` triggering its own dynamic import.
  useEffect(() => {
    let cancelled = false
    loadPack("tag-icons").then((m) => {
      if (!cancelled) setIcons(m)
    }).catch((err: unknown) => {
      log.icons.warn("failed to load tag-icons pack: %o", err)
    })
    return () => { cancelled = true }
  }, [])

  const handleSelect = (tag: TagRow) => {
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
      icons={icons}
      showCloseButton={isMobile}
    />
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      content={list}
      popoverProps={{
        align: "start",
        side: "bottom",
        sideOffset: 4,
        className: "h-96 w-96 gap-0 overflow-hidden p-0",
      }}
      sheetProps={{
        side: "bottom",
        showCloseButton: false,
        className: "h-[85vh] gap-0 p-0",
      }}
    >
      {children}
    </ResponsiveDialog>
  )
}
