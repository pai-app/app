import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router"
import { TX_FILTER_KEY_PREFIX } from "@shared/providers"
import { minorToMajor } from "@/lib/format"
import { useObservable } from "@/lib/use-observable"
import { useServices } from "@/providers/services-provider"
import type { TransactionRow } from "./use-transactions-query"

/** Tagged/untagged constraint, or `null` for "no tag filter". */
export type TagFilter = "tagged" | "untagged" | null

/**
 * Compound, unnamed transaction filter. Persisted per tenant to
 * `sessionStorage`. Amount bounds are **major units** in the tenant's default
 * currency and compared on the absolute value.
 */
export type TransactionFilter = {
  readonly sort: "asc" | "desc"
  readonly accountIds: readonly string[]   // empty = all
  readonly tag: TagFilter
  readonly amountMin?: number              // major units
  readonly amountMax?: number              // major units
  readonly search: string                  // narration/title substring OR exact amount
}

export const EMPTY_FILTER: TransactionFilter = {
  sort: "desc",
  accountIds: [],
  tag: null,
  search: "",
}

function storageKey(tenantId: string | undefined): string {
  return `${TX_FILTER_KEY_PREFIX}${tenantId ?? "_"}`
}

function loadFilter(tenantId: string | undefined): TransactionFilter {
  try {
    const raw = sessionStorage.getItem(storageKey(tenantId))
    if (raw) return { ...EMPTY_FILTER, ...(JSON.parse(raw) as Partial<TransactionFilter>) }
  } catch {
    /* corrupt / unavailable storage — fall back to defaults */
  }
  return EMPTY_FILTER
}

/** Number of *constraint* filters active (sort and search excluded — the
 *  mobile filter pill badges these; search is its own pill). */
export function countActiveFilters(filter: TransactionFilter): number {
  let n = 0
  if (filter.accountIds.length > 0) n++
  if (filter.tag !== null) n++
  if (filter.amountMin !== undefined || filter.amountMax !== undefined) n++
  return n
}

function isDirty(filter: TransactionFilter): boolean {
  return (
    filter.sort !== EMPTY_FILTER.sort ||
    filter.search.trim() !== "" ||
    countActiveFilters(filter) > 0
  )
}

export type UseTransactionsFilter = {
  readonly filter: TransactionFilter
  readonly patch: (partial: Partial<TransactionFilter>) => void
  readonly clearAll: () => void
  readonly activeCount: number
  readonly dirty: boolean
  readonly filtered: readonly TransactionRow[]
  readonly untaggedCount: number
}

/**
 * Owns the transaction filter state (persisted per tenant) and applies it to
 * the supplied rows. The apply pipeline is memoised over the rows + filter, so
 * it only recomputes when either changes.
 */
export function useTransactionsFilter(
  transactions: readonly TransactionRow[],
): UseTransactionsFilter {
  const { tenantId } = useParams()
  const { accounts: accountsService, settings: settingsService } = useServices()
  const accounts = useObservable(accountsService.accounts$)
  const settings = useObservable(settingsService.settings$)
  const [filter, setFilter] = useState<TransactionFilter>(() => loadFilter(tenantId))

  // Persist on change. Writing to storage is a side-effect (not state), so an
  // effect is the right place.
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(tenantId), JSON.stringify(filter))
    } catch {
      /* ignore quota / unavailable storage */
    }
  }, [tenantId, filter])

  const patch = useCallback((partial: Partial<TransactionFilter>) => {
    setFilter((prev) => ({ ...prev, ...partial }))
  }, [])

  const clearAll = useCallback(() => { setFilter(EMPTY_FILTER) }, [])

  // Inbox-zero target: count untagged rows over the FULL current-year set
  // (not the filtered subset), so the badge stays stable as filters change.
  const untaggedCount = useMemo(
    () => transactions.filter((t) => !t.tagId).length,
    [transactions],
  )

  // accountId → currency, for converting minor-unit amounts to major units.
  const currencyByAccount = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of accounts) map.set(a.id, a.currency)
    return map
  }, [accounts])

  const filtered = useMemo(() => {
    const q = filter.search.trim().toLowerCase()
    const numeric = q !== "" && /^[\d.]+$/.test(q)
    const { accountIds, tag, amountMin, amountMax } = filter

    const majorAbs = (tx: TransactionRow): number => {
      const currency = currencyByAccount.get(tx.accountId) ?? settings.currency
      return Math.abs(minorToMajor(tx.amount, currency))
    }

    const rows = transactions.filter((tx) => {
      if (accountIds.length > 0 && !accountIds.includes(tx.accountId)) return false
      if (tag === "tagged" && !tx.tagId) return false
      if (tag === "untagged" && tx.tagId) return false
      if (amountMin !== undefined || amountMax !== undefined) {
        const major = majorAbs(tx)
        if (amountMin !== undefined && major < amountMin) return false
        if (amountMax !== undefined && major > amountMax) return false
      }
      if (q !== "") {
        const text = `${tx.title ?? ""} ${tx.narration}`.toLowerCase()
        const amountMatch = numeric && majorAbs(tx).toString() === q
        if (!text.includes(q) && !amountMatch) return false
      }
      return true
    })

    return [...rows].sort((a, b) =>
      filter.sort === "desc"
        ? b.transactionAt - a.transactionAt
        : a.transactionAt - b.transactionAt,
    )
  }, [transactions, filter, currencyByAccount, settings.currency])

  return {
    filter,
    patch,
    clearAll,
    activeCount: countActiveFilters(filter),
    dirty: isDirty(filter),
    filtered,
    untaggedCount,
  }
}
