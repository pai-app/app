import { defaultRangeExtractor, useVirtualizer, type Range, type VirtualItem } from "@tanstack/react-virtual"
import { useCallback, useMemo, useRef, type CSSProperties, type ReactNode, type RefObject } from "react"
import type { TransactionRow } from "@/entities/transaction"

type ListItem =
  | { readonly kind: "header"; readonly monthStart: number; readonly count: number }
  | { readonly kind: "row"; readonly tx: TransactionRow }

export type RenderRowArgs = {
  readonly tx: TransactionRow
  readonly first: boolean
  readonly last: boolean
}

export type RenderHeaderArgs = {
  readonly monthStart: number
  readonly count: number
  readonly active: boolean
}

export type TransactionVirtualizerProps = {
  readonly transactions: readonly TransactionRow[]
  readonly rowHeight: number
  readonly headerHeight: number
  /** Offset (px) at which the active month header pins, so it stops below any
   *  sticky chrome above the list (the filter bar) instead of the viewport top. */
  readonly stickyTop?: number
  /** The scroll container the list virtualizes against — injected by the caller
   *  so this view stays free of app context. */
  readonly scrollElementRef: RefObject<HTMLDivElement | null>
  readonly renderRow: (args: RenderRowArgs) => ReactNode
  readonly renderHeader: (args: RenderHeaderArgs) => ReactNode
}

/** UTC month-start (ms) for a transaction epoch — aligns with monthly partitions. */
function monthStartOf(epochMs: number): number {
  const d = new Date(epochMs)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
}

/**
 * Flatten date-sorted transactions into a header-interleaved list. Assumes
 * rows are contiguous by month (true for a single-field date sort), so each
 * month yields one header followed by its rows.
 */
function buildItems(transactions: readonly TransactionRow[]): {
  items: ListItem[]
  stickyIndices: number[]
} {
  const items: ListItem[] = []
  const stickyIndices: number[] = []
  let i = 0
  while (i < transactions.length) {
    const monthStart = monthStartOf(transactions[i].transactionAt)
    let j = i
    while (j < transactions.length && monthStartOf(transactions[j].transactionAt) === monthStart) j++
    stickyIndices.push(items.length)
    items.push({ kind: "header", monthStart, count: j - i })
    for (let k = i; k < j; k++) items.push({ kind: "row", tx: transactions[k] })
    i = j
  }
  return { items, stickyIndices }
}

function itemStyle(item: VirtualItem, header: boolean, active: boolean, stickyTop: number): CSSProperties {
  const style: CSSProperties = { top: 0, left: 0, width: "100%", height: `${item.size}px` }
  if (header) style.zIndex = 9
  if (active) {
    style.position = "sticky"
    style.top = stickyTop
    style.zIndex = 10
  } else {
    style.position = "absolute"
    style.transform = `translateY(${item.start}px)`
  }
  return style
}

/**
 * Virtualized transaction list with sticky month headers. Drives off the
 * provided `scrollElementRef`; the currently-pinned month header stays mounted
 * via a custom range extractor.
 */
export function TransactionVirtualizer({
  transactions,
  rowHeight,
  headerHeight,
  stickyTop = 0,
  scrollElementRef,
  renderRow,
  renderHeader,
}: TransactionVirtualizerProps) {
  const activeStickyIndexRef = useRef(0)

  const { items, stickyIndices } = useMemo(() => buildItems(transactions), [transactions])

  const isHeader = (index: number) => items[index]?.kind === "header"
  const isActiveSticky = (index: number) => activeStickyIndexRef.current === index
  const isFirstRow = (index: number) => stickyIndices.includes(index - 1)
  const isLastRow = (index: number) =>
    stickyIndices.includes(index + 1) || index === items.length - 1

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual mutates refs internally; the React Compiler intentionally skips this component.
  const virtualizer = useVirtualizer({
    count: items.length,
    overscan: 4,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (index) => (isHeader(index) ? headerHeight : rowHeight),
    rangeExtractor: useCallback(
      (range: Range) => {
        activeStickyIndexRef.current =
          [...stickyIndices].reverse().find((i) => range.startIndex >= i) ?? 0
        const next = new Set([activeStickyIndexRef.current, ...defaultRangeExtractor(range)])
        return [...next].sort((a, b) => a - b)
      },
      [stickyIndices],
    ),
  })

  return (
    <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
      {virtualizer.getVirtualItems().map((vItem) => {
        const item = items[vItem.index]
        const active = isActiveSticky(vItem.index)
        return (
          <div key={vItem.key} data-index={vItem.index} style={itemStyle(vItem, item.kind === "header", active, stickyTop)}>
            {item.kind === "header"
              ? renderHeader({ monthStart: item.monthStart, count: item.count, active })
              : renderRow({ tx: item.tx, first: isFirstRow(vItem.index), last: isLastRow(vItem.index) })}
          </div>
        )
      })}
    </div>
  )
}
