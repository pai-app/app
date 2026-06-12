import { defineEntity } from "@fyre-db/core"

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
