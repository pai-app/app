import { defineEntity } from "@fyre-db/core"

/**
 * Where a notification, when clicked, takes the user. Extend this union as
 * new producers add targets (e.g. `{ type: "account"; accountId }`). The
 * consumer dispatches behaviour via the notification action registry.
 */
export type NotificationRef =
  | { readonly type: "import-log"; readonly logId: string }     // composite importLog id

/**
 * A persisted, dismissable notification — the durable "inbox" channel. Other
 * channels (toast, and later browser/native) are delivery-time concerns
 * resolved from the kind registry and are never stored here.
 *
 * `kind` resolves to delivery channels (where it goes); `display` resolves to
 * presentation (icon/color/severity). Both are stored as plain keys and
 * re-resolved at render so restyling/re-routing never touches stored rows.
 *
 * Global key strategy — all notifications in one partition. Volume is
 * expected to stay low; cap to ~50 rows / 30 days on read if needed.
 */
export type Notification = {
  readonly kind: string              // → channels (delivery), via kind registry
  readonly display: string           // → icon/color/severity, via display registry
  readonly title: string
  readonly body?: string
  readonly acknowledgedAt?: number   // ms epoch — undefined = unread
  readonly ref?: NotificationRef
  readonly actionLabel?: string      // optional CTA label (toast action)
}

export const notificationEntity = defineEntity<Notification>("notification", {
  keyStrategy: "global",
})
