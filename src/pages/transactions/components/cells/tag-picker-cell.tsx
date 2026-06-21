import { useState } from "react"
import { TagPicker } from "@/components/tag-picker"
import { type TagView } from "@/services/tags-service"
import { useServices } from "@/providers/services-provider"
import { notifyTagSimilar } from "../../notify-tag-similar"
import { TagCell } from "./tag-cell"
import type { TransactionCellProps } from "./types"

/**
 * Interactive tag cell for list rows — wraps the presentational `TagCell` in a
 * `TagPicker` and persists the selection. Clicks are kept from bubbling so
 * tapping the tag doesn't also open the row's detail panel.
 */
export function TagPickerCell({ tx, className }: TransactionCellProps) {
  const { transactions: svc } = useServices()
  const [open, setOpen] = useState(false)

  const setTag = (selected: TagView | null) => {
    if (selected) {
      const { similar } = svc.tag(tx.id, selected.id)
      notifyTagSimilar(similar, selected.name, svc)
    } else {
      svc.untag(tx.id)
    }
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
