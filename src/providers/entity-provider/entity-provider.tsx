import { createContext, useContext, useMemo, type ReactNode } from "react"
import { FyreDbConfigError } from "@fyre-db/core"
import type { UserSettings } from "@/services/entities"
import { fiscalYearMonthKeys } from "@/lib/fiscal"
import { useLoadAccounts, type AccountRow } from "./use-load-accounts"
import { useLoadSettings } from "./use-load-settings"
import { useLoadTags, type DisplayTag } from "./use-load-tags"
import { useLoadYear } from "./use-load-year"
import { useConsumeFeatureCreds } from "@/providers/use-consume-feature-creds"

export type EntityContextValue = {
  readonly settings: UserSettings
  readonly setSettings: (patch: Partial<UserSettings>) => void
  readonly tags: readonly DisplayTag[]
  readonly accounts: readonly AccountRow[]
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
  const { year, setYear } = useLoadYear(settings)
  useConsumeFeatureCreds()

  const monthKeys = useMemo(
    () => fiscalYearMonthKeys(year, settings.firstMonth),
    [year, settings.firstMonth],
  )

  const value = useMemo<EntityContextValue>(
    () => ({ settings, setSettings, tags, accounts, year, setYear, monthKeys }),
    [settings, setSettings, tags, accounts, year, setYear, monthKeys],
  )

  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
}

/** Single hook for everything `<EntityProvider>` exposes. */
export function useEntity(): EntityContextValue {
  const ctx = useContext(EntityContext)
  if (!ctx) throw new FyreDbConfigError("useEntity must be used within an EntityProvider")
  return ctx
}
