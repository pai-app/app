import type { NotificationRef } from "@/services/entities/notification"

/**
 * Notification action registry. Maps a notification `ref.type` to the
 * behaviour that runs when the user clicks the notification (in a toast or
 * the inbox). Features register their own handler — typically from a
 * `useEffect` — so consumers (e.g. the profile pill) never need to import
 * each producing feature's service. Mirrors the magic-word registry.
 */

type RefType = NotificationRef["type"]
type RefOf<T extends RefType> = Extract<NotificationRef, { type: T }>

type AnyHandler = (ref: NotificationRef) => void

const handlers = new Map<RefType, AnyHandler>()
let fallback: (() => void) | undefined

/** Register the click handler for a ref type. Returns an unregister function. */
export function registerNotificationAction<T extends RefType>(
  type: T,
  handler: (ref: RefOf<T>) => void,
): () => void {
  // Stored wide; the lookup in `runNotificationAction` keys by `ref.type`, so
  // the ref handed to this wrapper always matches `T`.
  const wide: AnyHandler = (ref) => { handler(ref as RefOf<T>) }
  handlers.set(type, wide)
  return () => {
    if (handlers.get(type) === wide) handlers.delete(type)
  }
}

/** Register a fallback for refs with no handler (or no ref). */
export function registerNotificationFallback(handler: () => void): () => void {
  fallback = handler
  return () => {
    if (fallback === handler) fallback = undefined
  }
}

/** Run the action for a notification ref, or the fallback when none matches. */
export function runNotificationAction(ref?: NotificationRef): void {
  const handler = ref ? handlers.get(ref.type) : undefined
  if (handler && ref) handler(ref)
  else fallback?.()
}
