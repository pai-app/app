import { useState } from "react"
import { useFyreDb } from "@fyre-db/plugins-ui"
import { Icon } from "@/ui/icon"
import { Separator } from "@/ui/separator"
import { Textarea } from "@/ui/textarea"
import { MoneyAccountIcon } from "@/ui/money-account-icon"
import { cn } from "@/lib/utils"
import { useApp } from "@/providers/app-provider"
import { useEntity, type DisplayTag } from "@/providers/entity-provider"
import {
  transactionEntity,
  importSourceEntity,
  type ImportSourceDescriptor,
  type MoneyAccount,
} from "@/services/entities"
import { TagPicker } from "@/components/tag-picker"
import { log } from "@/log"
import type { TransactionRow } from "../use-transactions-query"
import { AmountCell } from "./cells/amount-cell"
import { TagCell } from "./cells/tag-cell"

const DETAIL_DATE_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const SOURCE_DATE_FMT = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

/** Last-4 mask of an account's stored number, when available. */
function maskAccountNumber(metadata: MoneyAccount["metadata"]): string | undefined {
  // metadata values may not exist for the "accountNumber" key at runtime
  // even though the type is Record<string, readonly string[]>
  const numbers = metadata["accountNumber"] as readonly string[] | undefined
  const first = numbers?.[0]
  if (!first || first.length < 4) return undefined
  return `****${first.slice(-4)}`
}

export type TransactionDetailProps = {
  readonly tx: TransactionRow
  readonly onClose: () => void
}

/**
 * Transaction detail panel — amount, tag, date, direction + account, an
 * editable Notes field (the transaction `title`), the raw narration, and the
 * import provenance. Mirrors the old app's `TransactionDetailView`.
 *
 * Layout is responsive but **inline**, not an overlay: a sticky side panel on
 * desktop, a full back-navigable view on mobile. Only the tag picker uses an
 * adaptive overlay.
 */
export function TransactionDetail({ tx, onClose }: TransactionDetailProps) {
  const { isMobile } = useApp()
  const { accounts } = useEntity()
  const fyredb = useFyreDb()

  // Local edit buffer for the Notes field, reset (during render, not in an
  // effect) whenever the selected transaction changes.
  const [titleState, setTitleState] = useState({ id: tx.id, value: tx.title ?? "" })
  if (titleState.id !== tx.id) {
    setTitleState({ id: tx.id, value: tx.title ?? "" })
  }
  const title = titleState.value
  const [tagPickerOpen, setTagPickerOpen] = useState(false)

  // Resolve import provenance. The composite `sourceId` encodes its partition,
  // so a direct in-memory `get` is unambiguous across months. Resolved during
  // render and memoised by (fyredb-ready, sourceId) so it re-runs once the
  // repo becomes available.
  const resolveKey = `${fyredb ? "1" : "0"}:${tx.sourceId ?? ""}`
  const [sourceState, setSourceState] = useState<{ key: string; source: ImportSourceDescriptor | null }>(
    () => ({ key: "", source: null }),
  )
  if (sourceState.key !== resolveKey) {
    const resolved = fyredb && tx.sourceId
      ? fyredb.repo(importSourceEntity).get(tx.sourceId)?.descriptor ?? null
      : null
    setSourceState({ key: resolveKey, source: resolved })
  }
  const source = sourceState.source

  const account = accounts.find((a) => a.id === tx.accountId)
  const masked = account ? maskAccountNumber(account.metadata) : undefined
  const debited = tx.amount < 0

  const saveTitle = () => {
    if (!fyredb) return
    const next = title.trim()
    if (next === (tx.title ?? "")) return
    fyredb.repo(transactionEntity).save({ ...tx, title: next })
    log.home("transaction title updated: %s", tx.id)
  }

  const onTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      saveTitle()
      e.currentTarget.blur()
    } else if (e.key === "Escape") {
      setTitleState({ id: tx.id, value: tx.title ?? "" })
      e.currentTarget.blur()
    }
  }

  const setTitle = (value: string) => { setTitleState({ id: tx.id, value }) }

  const setTag = (tag: DisplayTag | null) => {
    if (!fyredb) return
    fyredb.repo(transactionEntity).save({ ...tx, tagId: tag?.id })
    setTagPickerOpen(false)
  }

  const content = (
    <div className="flex flex-col items-center gap-4 pb-4">
      <div className="text-4xl"><AmountCell amount={tx.amount} /></div>

      <TagPicker
        open={tagPickerOpen}
        onOpenChange={setTagPickerOpen}
        selectedTagId={tx.tagId ?? null}
        onSelect={setTag}
      >
        <TagCell tagId={tx.tagId ?? null} />
      </TagPicker>

      <Separator />

      <div className="flex w-full flex-row items-center gap-2 px-4">
        <Icon name="calendar" className="size-5 text-muted-foreground" />
        <span>{DETAIL_DATE_FMT.format(tx.transactionAt)}</span>
      </div>

      <div className="flex w-full flex-row items-center gap-2 px-4">
        <Icon
          name={debited ? "circle-arrow-up" : "circle-arrow-down"}
          className="size-5 text-muted-foreground"
        />
        <span>{debited ? "Debited from" : "Received in"}</span>
        {masked && <span className="text-muted-foreground">{masked}</span>}
        <div className="flex-1" />
        {account && <MoneyAccountIcon account={account} className="size-6 text-muted-foreground" />}
      </div>

      <Separator />

      <div className="flex w-full flex-row items-center gap-2 px-4 text-muted-foreground">
        <Icon name="notebook-pen" className="size-5" />
        <span>Notes</span>
      </div>
      <div className="w-full px-4">
        <Textarea
          placeholder="Start typing…"
          value={title}
          onChange={(e) => { setTitle(e.target.value) }}
          onKeyDown={onTitleKeyDown}
          onBlur={saveTitle}
          className="min-h-24 md:text-base"
        />
      </div>

      <Separator />

      <div className="flex w-full flex-row items-center gap-2 px-4 text-muted-foreground">
        <Icon name="pencil-line" className="size-5" />
        <span>Narration</span>
      </div>
      <div className="w-full wrap-break-word px-4 text-wrap">{tx.narration}</div>

      {source && (
        <>
          <Separator />
          <div className="flex w-full flex-row items-center gap-2 px-4 text-muted-foreground">
            <Icon name="download" className="size-5" />
            <span>Imported from</span>
          </div>
          <div className="flex w-full flex-row items-center gap-3 px-4">
            {source.kind === "file" ? (
              <>
                <Icon name="file-text" className="size-6 text-muted-foreground" />
                <span className="wrap-break-word">{source.fileName}</span>
              </>
            ) : (
              <>
                <Icon name="mail" className="size-6 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="wrap-break-word">{source.from}</span>
                  {source.receivedAt > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {SOURCE_DATE_FMT.format(source.receivedAt)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div className="py-4">
        <button type="button" onClick={onClose} className="m-4 cursor-pointer">
          <Icon name="arrow-left" className="size-5" />
        </button>
        {content}
      </div>
    )
  }

  return (
    <div className="sticky top-20 h-[calc(100vh-6rem)] w-96 overflow-y-auto rounded-xl border">
      <button type="button" onClick={onClose} className={cn("m-2 ml-auto block cursor-pointer")}>
        <Icon name="x" className="size-5" />
      </button>
      {content}
    </div>
  )
}
