import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { StrataConfigError } from '@strata/core'
import { useStrata } from '@strata/plugins-ui'
import {
  SYSTEM_TAGS,
  USER_SETTINGS_DEFAULTS,
  tagEntity,
  userSettingsEntity,
  type Tag,
  type UserSettings,
} from '@/services/entities'
import { log } from '@/log'

type EntityContextValue = {
  readonly settings: UserSettings
  readonly setSettings: (patch: Partial<UserSettings>) => void
  readonly year: number
  readonly setYear: (y: number) => void
  readonly tags: readonly Tag[]
}

const EntityContext = createContext<EntityContextValue | undefined>(undefined)

type EntityProviderProps = {
  readonly children: ReactNode
}

/** Fiscal year that today's date falls into, given a starting month (1..12). */
function currentFiscalYear(firstMonth: number): number {
  const today = new Date()
  const month = today.getMonth() + 1 // 1..12
  return month >= firstMonth ? today.getFullYear() : today.getFullYear() - 1
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
  const [year, setYear] = useState<number>(() => currentFiscalYear(USER_SETTINGS_DEFAULTS.firstMonth))
  const [tags, setTags] = useState<readonly Tag[]>([])

  useEffect(() => {
    if (!strata) return
    const repo = strata.repo(userSettingsEntity)
    const sub = repo.observe().subscribe((row) => {
      setSettingsState({ ...USER_SETTINGS_DEFAULTS, ...row })
    })
    return () => { sub.unsubscribe(); }
  }, [strata])

  // Seed system tags on first load (idempotent — only inserts rows missing
  // by id) then subscribe to the live list.
  useEffect(() => {
    if (!strata) return
    const repo = strata.repo(tagEntity)

    const missing = SYSTEM_TAGS.filter((t) => !repo.get(t.id))
    if (missing.length > 0) {
      log.app('seeding %d system tags', missing.length)
      repo.saveMany(missing)
    }

    const sub = repo.observeQuery().subscribe((rows) => {
      setTags(rows)
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
    () => ({ settings, setSettings, year, setYear, tags }),
    [settings, setSettings, year, tags],
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
