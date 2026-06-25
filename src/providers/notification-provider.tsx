import { useContext, useEffect, type ReactNode } from "react"
import { toast } from "sonner"
import {
  registerChannelEmitter,
  type NotificationPayload,
} from "@/services/notifications"
import { ServicesContext } from "@/providers/services-provider"
import { runNotificationAction } from "@/providers/notification-actions"

// ── Provider ────────────────────────────────────────────

type NotificationProviderProps = { readonly children: ReactNode }

/**
 * Registers the `toast` channel emitter so `notify()` can fan transient toasts
 * out via sonner. The durable inbox read side lives in `NotificationsService`.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const services = useContext(ServicesContext)

  // Register the toast channel. Clicking the toast's action runs the ref's
  // registered handler and acknowledges the inbox row (when persisted).
  useEffect(() => {
    return registerChannelEmitter("toast", (payload: NotificationPayload) => {
      const { notification: n, display } = payload
      const run = () => {
        runNotificationAction(n.ref)
        services?.notifications.markRead(payload.id)
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
  }, [services])

  return <>{children}</>
}
