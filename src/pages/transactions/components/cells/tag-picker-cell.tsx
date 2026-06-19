import { useState } from "react"
import { TagPicker } from "@/components/tag-picker"
import { type DisplayTag } from "@/providers/entity-provider"
import { useTagWithSimilar } from "../../use-tag-with-similar"
import { TagCell } from "./tag-cell"
import type { TransactionCellProps } from "./types"

/**
 * Interactive tag cell for list rows — wraps the presentational `TagCell` in a
 * `TagPicker` and persists the selection. Clicks are kept from bubbling so
 * tapping the tag doesn't also open the row's detail panel.
 */
export function TagPickerCell({ tx, className }: TransactionCellProps) {
  const { tag, untag } = useTagWithSimilar()
  const [open, setOpen] = useState(false)

  const setTag = (selected: DisplayTag | null) => {
    if (selected) tag(tx.id, selected.id, selected.name)
    else untag(tx.id)
    setOpen(false)
  }

  return (
    <TagPicker open={open} onOpenChange={setOpen} selectedTagId={tx.tagId ?? null} onSelect={setTag}>
      <TagCell
        tagId={tx.tagId ?? null}
        autoTagged={tx.autoTagged}
        className={className}
        onClick={(e) => { e.stopPropagation() }}
      />
    </TagPicker>
  )
}
