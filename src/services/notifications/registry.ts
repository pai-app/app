/**
 * Notification registries — two orthogonal lookup tables.
 *
 * - **Kind registry** answers *where* a notification goes (delivery channels:
 *   persistent inbox, transient toast, and later browser/native).
 * - **Display registry** answers *what it looks like* (icon, color, severity).
 *
 * Producers emit a `kind` + a `display` key; nothing presentational or
 * routing-related is stored on the row — it is re-resolved here at dispatch
 * and render time, so restyling or re-routing never touches stored data.
 */

// ── Channels ────────────────────────────────────────────

/** Delivery surfaces. `push` (browser/native notifications) is reserved for future use. */
export type NotificationChannel = "inbox" | "toast" | "push"

// ── Display registry ────────────────────────────────────

/** Severity maps onto the sonner toast variant. */
export type NotificationSeverity = "info" | "success" | "warning" | "error"

export type NotificationDisplay = {
  readonly icon: string             // icon key from icons.config.ts
  readonly color: string            // tailwind text token
  readonly severity: NotificationSeverity
}

/**
 * Visual presets. Predefined intents (`info`/`success`/`warning`/`error`) are
 * colored; add custom entries (e.g. `budget`) for bespoke looks.
 */
export const DISPLAY_REGISTRY = {
  info: { icon: "info", color: "text-blue-500", severity: "info" },
  success: { icon: "circle-check", color: "text-green-600", severity: "success" },
  warning: { icon: "triangle-alert", color: "text-amber-500", severity: "warning" },
  error: { icon: "circle-x", color: "text-destructive", severity: "error" },
} as const satisfies Record<string, NotificationDisplay>

export type NotificationDisplayKey = keyof typeof DISPLAY_REGISTRY

const DEFAULT_DISPLAY: NotificationDisplay = DISPLAY_REGISTRY.info

/** Resolve a display key to its preset, falling back to `info`. */
export function resolveDisplay(key: string): NotificationDisplay {
  return (DISPLAY_REGISTRY as Record<string, NotificationDisplay>)[key] ?? DEFAULT_DISPLAY
}

// ── Kind registry ───────────────────────────────────────

export type NotificationKindDef = {
  readonly channels: readonly NotificationChannel[]
}

/** Per-kind delivery policy. New producers register their kind here. */
export const KIND_REGISTRY = {
  "import-error": { channels: ["inbox", "toast"] },
  "import-needs-input": { channels: ["inbox", "toast"] },
} as const satisfies Record<string, NotificationKindDef>

export type NotificationKind = keyof typeof KIND_REGISTRY

const DEFAULT_KIND: NotificationKindDef = { channels: ["inbox"] }

/** Resolve a kind to its delivery policy, falling back to inbox-only. */
export function resolveKind(kind: string): NotificationKindDef {
  return (KIND_REGISTRY as Record<string, NotificationKindDef>)[kind] ?? DEFAULT_KIND
}
