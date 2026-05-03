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

/**
 * Connected auth accounts (e.g. email via Google OAuth feature login).
 * Keyed globally — one row per provider+feature combination.
 */
export type AuthAccount = {
  readonly provider: string
  readonly feature: string
  readonly userId: string
  readonly email: string
  readonly name: string
  readonly picture: string
  readonly refreshToken: string
}

export const authAccountEntity = defineEntity<AuthAccount>("auth-account", {
  keyStrategy: "global",
  deriveId: (a) => `${a.provider}:${a.feature}:${a.userId}`,
})

export const ENTITIES = [userSettingsEntity, authAccountEntity] as const
