import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { useStrata } from "@fyre-db/plugins-ui"
import { StrataConfigError } from "@fyre-db/core"
import type { BaseEntity } from "@fyre-db/core"
import { notificationEntity, type Notification } from "@/services/entities/notification"
import {
  acknowledgeNotification,
  registerChannelEmitter,
  type NotificationPayload,
} from "@/services/notifications"
import { useTenantReady } from "@/providers/use-tenant-ready"
import { runNotificationAction } from "@/lib/notification-actions"

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
 * Observes the `notification` entity (the inbox channel) and exposes
 * unacknowledged count + acknowledge action, driving the red dot on the
 * profile pill. Also registers the `toast` channel emitter so `notify()` can
 * fan transient toasts out via sonner.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const strata = useStrata()
  const ready = useTenantReady()
  const [notifications, setNotifications] = useState<ReadonlyArray<Notification & BaseEntity>>([])

  useEffect(() => {
    if (!strata || !ready) return
    const repo = strata.repo(notificationEntity)
    const sub = repo.observeQuery().subscribe(setNotifications)
    return () => { sub.unsubscribe() }
  }, [strata, ready])

  // Register the toast channel. Clicking the toast's action runs the ref's
  // registered handler and acknowledges the inbox row (when persisted).
  useEffect(() => {
    return registerChannelEmitter("toast", (payload: NotificationPayload) => {
      const { notification: n, display } = payload
      const run = () => {
        runNotificationAction(n.ref)
        if (strata) acknowledgeNotification(strata, payload.id)
      }
      const action = n.ref
        ? { label: n.actionLabel ?? "View", onClick: run }
        : undefined
      const options = { description: n.body, action }
      const variant = display.severity
      if (variant === "error") toast.error(n.title, options)
      else if (variant === "warning") toast.warning(n.title, options)
      else if (variant === "success") toast.success(n.title, options)
      else toast.info(n.title, options)
    })
  }, [strata])

  const unacknowledgedCount = useMemo(
    () => notifications.filter((n) => !n.acknowledgedAt).length,
    [notifications],
  )

  const acknowledge = useCallback((id: string) => {
    if (!strata || !ready) throw new StrataConfigError("Notifications are unavailable until a household is open")
    acknowledgeNotification(strata, id)
  }, [strata, ready])

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
