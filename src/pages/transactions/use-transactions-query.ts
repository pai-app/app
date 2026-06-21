import { useObservable } from "@/lib/use-observable"
import { useObservableQuery } from "@/lib/use-observable-query"
import { useServices } from "@/providers/services-provider"

export type { TransactionRow } from "@/services/transactions-service"
import type { TransactionRow } from "@/services/transactions-service"

export type UseTransactionsResult = {
  readonly transactions: readonly TransactionRow[]
  readonly loading: boolean
}

/**
 * Subscribes to the transactions for the active fiscal year. Scopes the query
 * by `monthKeys` (from `settings.monthKeys$`), which both filters to the year's months
 * and drives lazy partition hydration. Ordering is applied downstream by
 * `useTransactionsFilter` (which owns the sort direction).
 */
export function useTransactionsQuery(): UseTransactionsResult {
  const { transactions: svc, settings } = useServices()
  const monthKeys = useObservable(settings.monthKeys$)
  const { value, loading } = useObservableQuery<readonly TransactionRow[]>(
    () => svc.observeMonths(monthKeys),
    [svc, monthKeys],
    [],
  )
  return { transactions: value, loading }
}
