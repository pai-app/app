import { defineEntity } from "@fyre-db/core"
import type { Notification } from "@/entities/notification"

export const notificationEntity = defineEntity<Notification>("notification", {
  keyStrategy: "global",
})
