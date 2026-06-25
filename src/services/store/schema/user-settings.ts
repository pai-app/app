import { defineEntity } from "@fyre-db/core"
import type { UserSettings } from "@/entities/user-settings"

export const userSettingsEntity = defineEntity<UserSettings>("user-settings", {
  keyStrategy: "singleton",
})
