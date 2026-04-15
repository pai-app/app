import { defineEntity } from "strata-data-sync"

export type AccountMeta = {
  readonly displayName: string
  readonly identifier: string
  readonly avatarUrl?: string
}

export type FeatureAccount = {
  readonly provider: string
  readonly feature: string
  readonly accessToken: string
  readonly refreshToken: string
  readonly expiresAt: number
  readonly meta: AccountMeta
}

export const featureAccountDef = defineEntity<FeatureAccount>("feature-account", {
  deriveId: (a) => `${a.provider}-${a.feature}-${a.meta.identifier.replaceAll('.', '-')}`,
})
