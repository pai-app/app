import { defineEntity } from "@strata/core"

/**
 * Per-app preferences (theme, default currency, etc.). Singleton — exactly
 * one row per tenant. Real domain entities (accounts, transactions, …) are
 * added as features land.
 */
export type AppPrefs = {
  readonly theme?: "light" | "dark" | "system"
  readonly currency?: string
}

export const appPrefsEntity = defineEntity<AppPrefs>("app-prefs", {
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

export const ENTITIES = [appPrefsEntity, authAccountEntity] as const
