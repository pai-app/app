import { defineEntity } from "@strata/core"

/**
 * Per-tenant user-controlled settings. Singleton — exactly one row per tenant.
 * Holds stable, intentional preferences synced across devices.
 *
 * NOT here: theme (per-device, localStorage), transient UI state.
 */
export type UserSettings = {
  readonly locale: string         // BCP 47, e.g. 'en-IN'
  readonly currency: string       // ISO 4217, e.g. 'INR'
  readonly firstMonth: number     // 1..12 — fiscal year start month
  readonly firstDay: number       // 1..7 — ISO 8601 week start (1=Mon, 7=Sun)
}

export const USER_SETTINGS_DEFAULTS: UserSettings = {
  locale: "en-IN",
  currency: "INR",
  firstMonth: 4,    // April (Indian fiscal year)
  firstDay: 1,      // Monday (ISO)
}

export const userSettingsEntity = defineEntity<UserSettings>("user-settings", {
  keyStrategy: "singleton",
})
