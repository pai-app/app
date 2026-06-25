import { defineEntity } from "@fyre-db/core"
import type { Tag } from "@/entities/tag"

export const tagEntity = defineEntity<Tag>("tag", {
  keyStrategy: "global",
})
