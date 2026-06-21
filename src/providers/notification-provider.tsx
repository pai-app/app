import { useEffect, type ReactNode } from "react"
import { toast } from "sonner"
import { useFyreDb } from "@fyre-db/plugins-ui"
import {
  acknowledgeNotification,
  registerChannelEmitter,
  type NotificationPayload,
} from "@/services/notifications"
import { runNotificationAction } from "@/lib/notification-actions"

// ── Provider ────────────────────────────────────────────

type NotificationProviderProps = { readonly children: ReactNode }

/**
 * Registers the `toast` channel emitter so `notify()` can fan transient toasts
 * out via sonner. The durable inbox read side lives in `NotificationsService`.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const fyredb = useFyreDb()

  // Register the toast channel. Clicking the toast's action runs the ref's
  // registered handler and acknowledges the inbox row (when persisted).
  useEffect(() => {
    return registerChannelEmitter("toast", (payload: NotificationPayload) => {
      const { notification: n, display } = payload
      const run = () => {
        runNotificationAction(n.ref)
        if (fyredb) acknowledgeNotification(fyredb, payload.id)
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
  }, [fyredb])

  return <>{children}</>
}
