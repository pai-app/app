import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { StrataConfigError, type BaseEntity } from '@strata/core'
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

/** A tag with an `id` — either a stable system-tag id or a repo-generated id. */
export type TagRow = Tag & { readonly id: string }

type EntityContextValue = {
  readonly settings: UserSettings
  readonly setSettings: (patch: Partial<UserSettings>) => void
  readonly year: number
  readonly setYear: (y: number) => void
  /** System tags first (configured order), then user tags (alphabetical by name). */
  readonly tags: readonly TagRow[]
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
 * Subscribes to per-tenant entities (UserSettings, user-defined Tags, …) and
 * exposes them via `useSettings()`.
 *
 * System tags (defined in `services/entities/system-tags.ts`) are baked into
 * the app and never written to the store — they're read-only and merged with
 * user tags at read time. This keeps the cloud blob lean and avoids sync
 * conflicts on shipped data.
 */
export function EntityProvider({ children }: EntityProviderProps) {
  const strata = useStrata()
  const [settings, setSettingsState] = useState<UserSettings>(USER_SETTINGS_DEFAULTS)
  const [year, setYear] = useState<number>(() => currentFiscalYear(USER_SETTINGS_DEFAULTS.firstMonth))
  const [userTags, setUserTags] = useState<readonly (Tag & BaseEntity)[]>([])

  useEffect(() => {
    if (!strata) return
    const repo = strata.repo(userSettingsEntity)
    const sub = repo.observe().subscribe((row) => {
      setSettingsState({ ...USER_SETTINGS_DEFAULTS, ...row })
    })
    return () => { sub.unsubscribe(); }
  }, [strata])

  useEffect(() => {
    if (!strata) return
    const repo = strata.repo(tagEntity)
    const sub = repo.observeQuery().subscribe((rows) => {
      setUserTags(rows)
    })
    return () => { sub.unsubscribe(); }
  }, [strata])

  const tags = useMemo<readonly TagRow[]>(() => {
    const sortedUserTags = [...userTags].sort((a, b) => a.name.localeCompare(b.name))
    return [...SYSTEM_TAGS, ...sortedUserTags]
  }, [userTags])

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
