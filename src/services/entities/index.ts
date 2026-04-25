import { defineEntity } from "strata-data-sync"

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

export const ENTITIES = [appPrefsEntity] as const
