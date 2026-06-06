import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useStrata } from "@strata/plugins-ui"
import { StrataConfigError } from "@strata/core"
import type { BaseEntity } from "@strata/core"
import { notificationEntity, type Notification } from "@/services/entities/notification"

// ── Context shape ───────────────────────────────────────

type NotificationContextValue = {
  readonly notifications: ReadonlyArray<Notification & BaseEntity>
  readonly unacknowledgedCount: number
  readonly acknowledge: (id: string) => void
}

const NotificationCtx = createContext<NotificationContextValue | undefined>(undefined)

// ── Provider ────────────────────────────────────────────

type NotificationProviderProps = { readonly children: ReactNode }

/**
 * Observes the `notification` entity and exposes unacknowledged count +
 * acknowledge action. Drives the red dot on the profile pill.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const strata = useStrata()
  const [notifications, setNotifications] = useState<ReadonlyArray<Notification & BaseEntity>>([])

  useEffect(() => {
    if (!strata) return
    const repo = strata.repo(notificationEntity)
    const sub = repo.observeQuery().subscribe(setNotifications)
    return () => { sub.unsubscribe() }
  }, [strata])

  const unacknowledgedCount = useMemo(
    () => notifications.filter((n) => !n.acknowledgedAt).length,
    [notifications],
  )

  const acknowledge = useCallback((id: string) => {
    if (!strata) return
    const repo = strata.repo(notificationEntity)
    const existing = repo.get(id)
    if (!existing || existing.acknowledgedAt) return
    repo.save({ ...existing, acknowledgedAt: Date.now() })
  }, [strata])

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, unacknowledgedCount, acknowledge }),
    [notifications, unacknowledgedCount, acknowledge],
  )

  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>
}

// ── Hook ────────────────────────────────────────────────

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationCtx)
  if (!ctx) throw new StrataConfigError("useNotifications must be used within a NotificationProvider")
  return ctx
}
