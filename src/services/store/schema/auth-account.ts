import { defineEntity } from "@fyre-db/core"
import type { AuthAccount } from "@/entities/auth-account"

export const authAccountEntity = defineEntity<AuthAccount>("auth-account", {
  keyStrategy: "global",
  deriveId: (a) => `${a.provider}:${a.feature}:${a.userId}`,
})
