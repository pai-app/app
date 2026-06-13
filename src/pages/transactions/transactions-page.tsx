import { useEffect, useState } from "react"
import { useApp } from "@/providers/app-provider"
import { Icon } from "@/ui/icon"
import { Button } from "@/ui/button"
import { Spinner } from "@/ui/spinner"
import { loadPack } from "@/lib/icons/icon-loader"
import { log } from "@/log"
import { useTransactionsQuery } from "./use-transactions-query"
import { useTransactionsFilter } from "./use-transactions-filter"
import { TransactionVirtualizer } from "./components/transaction-virtualizer"
import { MonthHeader } from "./components/month-header"
import { TransactionTableRow } from "./components/transaction-table-row"
import { TransactionCardRow } from "./components/transaction-card-row"
import { TransactionDetail } from "./components/transaction-detail"
import { FilterBar } from "./components/filter-bar"
import { FilterSheet } from "./components/filter-sheet"

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Icon name="arrow-left-right" className="size-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No transactions found</p>
    </div>
  )
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon name="search" className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No transactions match your filters</p>
      <Button variant="outline" size="sm" onClick={onClear}>Clear all</Button>
    </div>
  )
}

/**
 * Transactions list for the active fiscal year. Virtualized with sticky month
 * headers; responsive table (desktop) / card (mobile) rows. Compound filtering
 * (sort, accounts, tag, amount, search) is persisted per tenant. Detail panel
 * supports tagging + notes editing.
 */
export function TransactionsPage() {
  const { isMobile } = useApp()
  const { transactions, loading } = useTransactionsQuery()
  const filterState = useTransactionsFilter(transactions)
  const { filtered, clearAll } = filterState
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Measure the sticky filter chrome so the month headers can pin directly
  // below it instead of sliding to the top of the scroll viewport. Desktop
  // chrome pins at 72px (≈10px below the navbar); mobile at `top-0`.
  const [filterEl, setFilterEl] = useState<HTMLDivElement | null>(null)
  const [filterHeight, setFilterHeight] = useState(0)
  useEffect(() => {
    if (!filterEl) return
    const measure = () => { setFilterHeight(filterEl.offsetHeight) }
    const ro = new ResizeObserver(measure)
    ro.observe(filterEl)
    measure()
    return () => { ro.disconnect() }
  }, [filterEl])
  const stickyTop = (isMobile ? 0 : 72) + filterHeight

  // Warm the bank-icons pack so account marks render in a single chunk
  // instead of each `<MoneyAccountIcon>` triggering its own dynamic import.
  useEffect(() => {
    loadPack("bank-icons").catch((err: unknown) => {
      log.icons.warn("failed to load bank-icons pack: %o", err)
    })
  }, [])

  // Resolve the selected row from the filtered list so edits stay reflected
  // and a row filtered out simply deselects.
  const selectedTx = selectedId
    ? filtered.find((t) => t.id === selectedId) ?? null
    : null

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  // No data at all (vs no matches) — skip the filter chrome entirely.
  if (transactions.length === 0) return <EmptyState />

  // Mobile: the detail view replaces the list entirely.
  if (isMobile && selectedTx) {
    return <TransactionDetail tx={selectedTx} onClose={() => { setSelectedId(null) }} />
  }

  return (
    <div className="flex flex-col">
      {isMobile ? (
        <FilterSheet ref={setFilterEl} state={filterState} resultCount={filtered.length} />
      ) : (
        <FilterBar ref={setFilterEl} state={filterState} />
      )}

      <div className="flex flex-row gap-4">
        <div className="min-w-0 flex-1 pb-4">
          {filtered.length === 0 ? (
            <NoResults onClear={clearAll} />
          ) : (
            <TransactionVirtualizer
              transactions={filtered}
              rowHeight={isMobile ? 120 : 54}
              headerHeight={isMobile ? 44 : 50}
              stickyTop={stickyTop}
              renderHeader={(args) => <MonthHeader {...args} />}
              renderRow={(args) =>
                isMobile ? (
                  <TransactionCardRow
                    tx={args.tx}
                    onClick={() => { setSelectedId(args.tx.id) }}
                  />
                ) : (
                  <TransactionTableRow
                    tx={args.tx}
                    first={args.first}
                    last={args.last}
                    selected={args.tx.id === selectedId}
                    onClick={() => { setSelectedId(args.tx.id) }}
                  />
                )
              }
            />
          )}
        </div>
        {!isMobile && selectedTx && (
          <TransactionDetail tx={selectedTx} onClose={() => { setSelectedId(null) }} />
        )}
      </div>
    </div>
  )
}
