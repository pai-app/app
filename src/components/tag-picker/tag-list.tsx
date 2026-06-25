import { useRef, type ChangeEvent } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Icon } from "@/ui/icon"
import { Input } from "@/ui/input"
import { Button } from "@/ui/button"
import { SheetClose } from "@/ui/sheet"
import type { TagView } from "@/entities/tag-view"
import { TagItem } from "./tag-item"
import type { TagWithChildren } from "./types"

export type TagListProps = {
  readonly rows: readonly TagWithChildren[]
  readonly query: string
  readonly onQueryChange: (e: ChangeEvent<HTMLInputElement>) => void
  readonly onSelect: (tag: TagView) => void
  readonly selectedTagId: string | null
  /** When true, shows a `<SheetClose>` button next to the search input. */
  readonly showCloseButton: boolean
}

/**
 * Virtualised list with a sticky search input at the top. The close button is
 * shown only inside a sheet, where the dialog primitive doesn't auto-render
 * one.
 */
export function TagList({
  rows,
  query,
  onQueryChange,
  onSelect,
  selectedTagId,
  showCloseButton,
}: TagListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual mutates refs internally; the React Compiler intentionally skips this component.
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 4,
  })

  const items = virtualizer.getVirtualItems()

  return (
    <div ref={scrollRef} className="relative flex h-full flex-col gap-3 overflow-auto p-3">
      <div className="sticky top-0 z-10 flex flex-row items-center gap-1 bg-popover/80 backdrop-blur">
        <Input
          autoFocus
          value={query}
          onChange={onQueryChange}
          placeholder="Search tags…"
        />
        {showCloseButton && (
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <Icon name="x" />
            </Button>
          </SheetClose>
        )}
      </div>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        <div
          className="absolute top-0 left-0 w-full"
          style={{ transform: `translateY(${items[0]?.start ?? 0}px)` }}
        >
          {items.map((item) => (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
            >
              <TagItem
                tag={rows[item.index]}
                onSelect={onSelect}
                selectedTagId={selectedTagId}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
