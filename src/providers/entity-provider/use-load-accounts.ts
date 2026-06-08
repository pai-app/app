import { useEffect, useState } from "react"
import type { BaseEntity } from "@strata/core"
import { useStrata } from "@strata/plugins-ui"
import { moneyAccountEntity, type MoneyAccount } from "@/services/entities"
import { useTenantReady } from "@/providers/use-tenant-ready"

export type AccountRow = MoneyAccount & BaseEntity

/**
 * Internal hook — subscribes to all `MoneyAccount` rows for the active
 * tenant. Only consumed by `<EntityProvider>`; consumers read the list via
 * `useAccounts()`.
 */
export function useLoadAccounts(): readonly AccountRow[] {
  const strata = useStrata()
  const ready = useTenantReady()
  const [accounts, setAccounts] = useState<readonly AccountRow[]>([])

  useEffect(() => {
    if (!strata || !ready) return
    const repo = strata.repo(moneyAccountEntity)
    const sub = repo.observeQuery().subscribe(setAccounts)
    return () => { sub.unsubscribe() }
  }, [strata, ready])

  return accounts
}
