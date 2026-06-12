import { useEffect, useState } from "react"
import { useFyreDb } from "@fyre-db/plugins-ui"
import type { BaseEntity } from "@fyre-db/core"
import { transactionEntity, type Transaction } from "@/services/entities"
import { useEntity } from "@/providers/entity-provider"

export type TransactionRow = Transaction & BaseEntity

export type UseTransactionsResult = {
  readonly transactions: readonly TransactionRow[]
  readonly loading: boolean
}

/**
 * Subscribes to the transactions for the active fiscal year. Scopes the query
 * by `monthKeys` (from `useEntity()`), which both filters to the year's months
 * and drives lazy partition hydration. Ordering is applied downstream by
 * `useTransactionsFilter` (which owns the sort direction).
 */
export function useTransactionsQuery(): UseTransactionsResult {
  const fyredb = useFyreDb()
  const { monthKeys } = useEntity()
  const [transactions, setTransactions] = useState<readonly TransactionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!fyredb) return
    const repo = fyredb.repo(transactionEntity)
    const sub = repo
      .observeQuery({ keys: monthKeys })
      .subscribe((rows) => {
        setTransactions(rows)
        setLoading(false)
      })
    return () => { sub.unsubscribe() }
  }, [fyredb, monthKeys])

  return { transactions, loading }
}
