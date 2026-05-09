import { createContext, useContext, useMemo, type ReactNode } from "react"
import { StrataConfigError } from "@strata/core"
import type { UserSettings } from "@/services/entities"
import { useLoadAccounts, type AccountRow } from "./use-load-accounts"
import { useLoadSettings } from "./use-load-settings"
import { useLoadTags, type DisplayTag } from "./use-load-tags"
import { useLoadYear } from "./use-load-year"

export type EntityContextValue = {
  readonly settings: UserSettings
  readonly setSettings: (patch: Partial<UserSettings>) => void
  readonly tags: readonly DisplayTag[]
  readonly accounts: readonly AccountRow[]
  readonly year: number
  readonly setYear: (y: number) => void
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

  const value = useMemo<EntityContextValue>(
    () => ({ settings, setSettings, tags, accounts, year, setYear }),
    [settings, setSettings, tags, accounts, year, setYear],
  )

  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
}

/** Single hook for everything `<EntityProvider>` exposes. */
export function useEntity(): EntityContextValue {
  const ctx = useContext(EntityContext)
  if (!ctx) throw new StrataConfigError("useEntity must be used within an EntityProvider")
  return ctx
}
