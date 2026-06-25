import { defineEntity } from "@fyre-db/core"
import type { MoneyAccount } from "@/entities/money-account"

export const moneyAccountEntity = defineEntity<MoneyAccount>("money-account", {
  keyStrategy: "global",
})
