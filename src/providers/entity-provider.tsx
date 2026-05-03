import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { StrataConfigError } from '@strata/core'
import { useStrata } from '@strata/plugins-ui'
import { USER_SETTINGS_DEFAULTS, userSettingsEntity, type UserSettings } from '@/services/entities'
import { log } from '@/log'

type EntityContextValue = {
  readonly settings: UserSettings
  readonly setSettings: (patch: Partial<UserSettings>) => void
}

const EntityContext = createContext<EntityContextValue | undefined>(undefined)

type EntityProviderProps = {
  readonly children: ReactNode
}

/**
 * Subscribes to per-tenant entities (UserSettings, …) and exposes them via
 * `useSettings()`-style hooks.
 *
 * Mounted at the app root. When no Strata instance / tenant is active (e.g.
 * on `/login`, `/tenants`), it serves defaults; pages behind `TenantGuard`
 * see live entity data because by then `useStrata()` is non-null.
 */
export function EntityProvider({ children }: EntityProviderProps) {
  const strata = useStrata()
  const [settings, setSettingsState] = useState<UserSettings>(USER_SETTINGS_DEFAULTS)

  useEffect(() => {
    if (!strata) return
    const repo = strata.repo(userSettingsEntity)
    const sub = repo.observe().subscribe((row) => {
      setSettingsState({ ...USER_SETTINGS_DEFAULTS, ...row })
    })
    return () => { sub.unsubscribe(); }
  }, [strata])

  const setSettings = useCallback((patch: Partial<UserSettings>) => {
    if (!strata) {
      log.app.warn('setSettings called before Strata is ready; ignoring')
      return
    }
    const repo = strata.repo(userSettingsEntity)
    const current = repo.get()
    const next: UserSettings = { ...USER_SETTINGS_DEFAULTS, ...current, ...patch }
    repo.save(next)
  }, [strata])

  const value = useMemo<EntityContextValue>(
    () => ({ settings, setSettings }),
    [settings, setSettings],
  )

  return (
    <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
  )
}

export function useSettings(): EntityContextValue {
  const ctx = useContext(EntityContext)
  if (!ctx) throw new StrataConfigError("useSettings must be used within an EntityProvider")
  return ctx
}
