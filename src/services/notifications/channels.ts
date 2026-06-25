import type { NotificationChannel, NotificationDisplay } from "./registry"
import type { Notification } from "@/entities/notification"

/**
 * Channel emitter registry. Non-persistent channels (toast, and later
 * `push` for browser/native notifications) register an emitter here; `notify()`
 * fans a resolved notification out to whichever channels its kind targets. The
 * `inbox` channel is handled directly by `notify()` (it needs `fyredb`), so it
 * does not register here.
 *
 * Pure TS, framework-agnostic — mirrors the magic-word registry. The toast
 * emitter (which imports sonner) registers itself from a UI-adjacent module.
 */

/**
 * A fully-resolved notification handed to channel emitters: the notification
 * entity plus everything resolved at dispatch — a guaranteed `id` (the inbox
 * row id, or a transient random id), the resolved `display` preset, and the
 * resolved delivery `channels`.
 */
export type NotificationPayload = {
  readonly id: string
  readonly notification: Notification
  readonly display: NotificationDisplay
  readonly channels: readonly NotificationChannel[]
}

type ChannelEmitter = (payload: NotificationPayload) => void

const emitters = new Map<NotificationChannel, ChannelEmitter>()

/** Register an emitter for a channel. Returns an unregister function. */
export function registerChannelEmitter(
  channel: NotificationChannel,
  emitter: ChannelEmitter,
): () => void {
  emitters.set(channel, emitter)
  return () => {
    if (emitters.get(channel) === emitter) emitters.delete(channel)
  }
}

/** Emit a payload to a single channel, if an emitter is registered. */
export function emitToChannel(channel: NotificationChannel, payload: NotificationPayload): void {
  emitters.get(channel)?.(payload)
}
