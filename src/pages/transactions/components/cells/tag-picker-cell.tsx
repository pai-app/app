import { useState } from "react"
import { useStrata } from "@fyre-db/plugins-ui"
import { TagPicker } from "@/components/tag-picker"
import { type DisplayTag } from "@/providers/entity-provider"
import { transactionEntity } from "@/services/entities"
import { log } from "@/log"
import type { TransactionRow } from "../../use-transactions-query"
import { TagCell } from "./tag-cell"

export type TagPickerCellProps = {
  readonly tx: TransactionRow
  readonly className?: string
}

/**
 * Interactive tag cell for list rows — wraps the presentational `TagCell` in a
 * `TagPicker` and persists the selection. Clicks are kept from bubbling so
 * tapping the tag doesn't also open the row's detail panel.
 */
export function TagPickerCell({ tx, className }: TagPickerCellProps) {
  const strata = useStrata()
  const [open, setOpen] = useState(false)

  const setTag = (tag: DisplayTag | null) => {
    if (strata) {
      strata.repo(transactionEntity).save({ ...tx, tagId: tag?.id })
      log.home("transaction tag updated: %s -> %s", tx.id, tag?.id ?? "(none)")
    }
    setOpen(false)
  }

  return (
    <TagPicker open={open} onOpenChange={setOpen} selectedTagId={tx.tagId ?? null} onSelect={setTag}>
      <TagCell
        tagId={tx.tagId ?? null}
        className={className}
        onClick={(e) => { e.stopPropagation() }}
      />
    </TagPicker>
  )
}
