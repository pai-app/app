import { useEffect, useState } from "react"
import type { BaseEntity } from "@fyre-db/core"
import { useFyreDb } from "@fyre-db/plugins-ui"
import { moneyAccountEntity, type MoneyAccount } from "@/services/entities"
import { useTenantReady } from "@/providers/use-tenant-ready"

export type AccountRow = MoneyAccount & BaseEntity

/**
 * Internal hook — subscribes to all `MoneyAccount` rows for the active
 * tenant. Only consumed by `<EntityProvider>`; consumers read the list via
 * `useAccounts()`.
 */
export function useLoadAccounts(): readonly AccountRow[] {
  const fyredb = useFyreDb()
  const ready = useTenantReady()
  const [accounts, setAccounts] = useState<readonly AccountRow[]>([])

  useEffect(() => {
    if (!fyredb || !ready) return
    const repo = fyredb.repo(moneyAccountEntity)
    const sub = repo.observeQuery().subscribe(setAccounts)
    return () => { sub.unsubscribe() }
  }, [fyredb, ready])

  return accounts
}
