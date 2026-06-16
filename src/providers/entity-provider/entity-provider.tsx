import { createContext, useContext, useMemo, type ReactNode } from "react"
import { FyreDbConfigError } from "@fyre-db/core"
import { useFyreDb } from "@fyre-db/plugins-ui"
import type { UserSettings } from "@/services/entities"
import { TransactionService } from "@/services/transactions/transaction-service"
import { fiscalYearMonthKeys } from "@/lib/fiscal"
import { useLoadAccounts, type AccountRow } from "./use-load-accounts"
import { useLoadSettings } from "./use-load-settings"
import { useLoadTagRules, type TagRuleRow } from "./use-load-tag-rules"
import { useLoadTags, type DisplayTag } from "./use-load-tags"
import { useLoadYear } from "./use-load-year"
import { useConsumeFeatureCreds } from "@/providers/use-consume-feature-creds"

export type EntityContextValue = {
  readonly settings: UserSettings
  readonly setSettings: (patch: Partial<UserSettings>) => void
  readonly tags: readonly DisplayTag[]
  readonly accounts: readonly AccountRow[]
  readonly tagRules: readonly TagRuleRow[]
  readonly transactionService: TransactionService | null
  readonly year: number
  readonly setYear: (y: number) => void
  /**
   * `YYYY-MM` partition keys for every month of the selected fiscal `year`.
   * Pass to a partitioned `query`/`observeQuery` (`{ keys: monthKeys }`) to
   * scope results to the active year and trigger lazy partition hydration.
   */
  readonly monthKeys: readonly string[]
}

const EntityContext = createContext<EntityContextValue | undefined>(undefined)

type EntityProviderProps = {
  readonly children: ReactNode
}

/**
 * Subscribes to per-tenant entities and exposes them via a single context.
 * Internal load-hooks keep subscription concerns narrow; consumers read
 * everything through `useEntity()`.
 */
export function EntityProvider({ children }: EntityProviderProps) {
  const { settings, setSettings } = useLoadSettings()
  const accounts = useLoadAccounts()
  const tags = useLoadTags(accounts)
  const tagRules = useLoadTagRules()
  const { year, setYear } = useLoadYear(settings)
  useConsumeFeatureCreds()

  const fyredb = useFyreDb()
  const transactionService = useMemo(
    () => (fyredb ? new TransactionService(fyredb) : null),
    [fyredb],
  )

  const monthKeys = useMemo(
    () => fiscalYearMonthKeys(year, settings.firstMonth),
    [year, settings.firstMonth],
  )

  const value = useMemo<EntityContextValue>(
    () => ({
      settings,
      setSettings,
      tags,
      accounts,
      tagRules,
      transactionService,
      year,
      setYear,
      monthKeys,
    }),
    [
      settings,
      setSettings,
      tags,
      accounts,
      tagRules,
      transactionService,
      year,
      setYear,
      monthKeys,
    ],
  )

  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
}

/** Single hook for everything `<EntityProvider>` exposes. */
export function useEntity(): EntityContextValue {
  const ctx = useContext(EntityContext)
  if (!ctx) throw new FyreDbConfigError("useEntity must be used within an EntityProvider")
  return ctx
}

/** The per-tenant TransactionService — the choke point for all tag mutations. */
export function useTransactionService(): TransactionService {
  const { transactionService } = useEntity()
  if (!transactionService) {
    throw new FyreDbConfigError("TransactionService is unavailable until a household is open")
  }
  return transactionService
}
