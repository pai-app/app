import { defineEntity } from "@fyre-db/core"
import type { TagRule } from "@/entities/tag-rule"

export const tagRuleEntity = defineEntity<TagRule>("tagRule", {
  keyStrategy: "global",
  deriveId: (r) => r.key,
})
