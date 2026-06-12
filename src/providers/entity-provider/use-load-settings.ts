import { useCallback, useEffect, useState } from "react"
import { useFyreDb } from "@fyre-db/plugins-ui"
import { USER_SETTINGS_DEFAULTS, userSettingsEntity, type UserSettings } from "@/services/entities"
import { useTenantReady } from "@/providers/use-tenant-ready"
import { log } from "@/log"

export type UseLoadSettingsResult = {
  readonly settings: UserSettings
  readonly setSettings: (patch: Partial<UserSettings>) => void
}

/**
 * Internal hook — subscribes to the singleton `userSettingsEntity` and
 * exposes a defaults-merged view + a patch-style writer. Only consumed by
 * `<EntityProvider>`; consumers read the result through `useSettings()`.
 */
export function useLoadSettings(): UseLoadSettingsResult {
  const fyredb = useFyreDb()
  const ready = useTenantReady()
  const [settings, setSettings] = useState<UserSettings>(USER_SETTINGS_DEFAULTS)

  useEffect(() => {
    if (!fyredb || !ready) return
    const repo = fyredb.repo(userSettingsEntity)
    const sub = repo.observe().subscribe((row) => {
      setSettings({ ...USER_SETTINGS_DEFAULTS, ...row })
    })
    return () => { sub.unsubscribe(); }
  }, [fyredb, ready])

  const patchSettings = useCallback((patch: Partial<UserSettings>) => {
    if (!fyredb) {
      log.app.warn("setSettings called before FyreDb is ready; ignoring")
      return
    }
    const repo = fyredb.repo(userSettingsEntity)
    const current = repo.get()
    repo.save({ ...USER_SETTINGS_DEFAULTS, ...current, ...patch })
  }, [fyredb])

  return { settings, setSettings: patchSettings }
}
