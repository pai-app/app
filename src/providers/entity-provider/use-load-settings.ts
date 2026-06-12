import { useCallback, useEffect, useState } from "react"
import { useStrata } from "@fyre-db/plugins-ui"
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
  const strata = useStrata()
  const ready = useTenantReady()
  const [settings, setSettings] = useState<UserSettings>(USER_SETTINGS_DEFAULTS)

  useEffect(() => {
    if (!strata || !ready) return
    const repo = strata.repo(userSettingsEntity)
    const sub = repo.observe().subscribe((row) => {
      setSettings({ ...USER_SETTINGS_DEFAULTS, ...row })
    })
    return () => { sub.unsubscribe(); }
  }, [strata, ready])

  const patchSettings = useCallback((patch: Partial<UserSettings>) => {
    if (!strata) {
      log.app.warn("setSettings called before Strata is ready; ignoring")
      return
    }
    const repo = strata.repo(userSettingsEntity)
    const current = repo.get()
    repo.save({ ...USER_SETTINGS_DEFAULTS, ...current, ...patch })
  }, [strata])

  return { settings, setSettings: patchSettings }
}
