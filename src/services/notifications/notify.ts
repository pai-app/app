import type { FyreDb } from "@fyre-db/core"
import { notificationEntity, type Notification } from "@/services/entities/notification"
import {
  resolveDisplay,
  resolveKind,
  type NotificationChannel,
} from "./registry"
import { emitToChannel, type NotificationPayload } from "./channels"

/** Per-call overrides. `channels` overrides the kind's default delivery policy. */
export type NotifyOptions = {
  readonly channels?: readonly NotificationChannel[]
}

/**
 * Produce a notification — the single fan-out point for every producer. Takes
 * the notification entity itself plus optional per-call overrides, resolves
 * its channels + display, persists an `inbox` row when targeted, and emits the
 * resulting payload to the other (transient) channels. Returns the inbox row
 * id when persisted, else `undefined`.
 *
 * Producers never supply an id: persisted rows are keyed by the framework on
 * save; transient-only notifications get a throwaway random id (it is never
 * stored, so it only needs to be unique for the in-flight payload).
 *
 * `fyredb` may be `null` for purely transient notifications (e.g. toast-only);
 * the `inbox` channel is simply skipped when no store is available.
 */
export function notify(
  fyredb: FyreDb | null,
  notification: Notification,
  options?: NotifyOptions,
): string | undefined {
  const channels = options?.channels ?? resolveKind(notification.kind).channels
  const display = resolveDisplay(notification.display)

  let id: string | undefined
  if (channels.includes("inbox") && fyredb) {
    id = fyredb.repo(notificationEntity).save(notification)
  }

  const payload: NotificationPayload = {
    id: id ?? crypto.randomUUID(),
    notification,
    display,
    channels,
  }
  for (const channel of channels) {
    if (channel !== "inbox") emitToChannel(channel, payload)
  }

  return id
}

/** Mark a persisted notification acknowledged (idempotent). */
export function acknowledgeNotification(fyredb: FyreDb, id: string): void {
  const repo = fyredb.repo(notificationEntity)
  const existing = repo.get(id)
  if (!existing || existing.acknowledgedAt) return
  repo.save({ ...existing, acknowledgedAt: Date.now() })
}
