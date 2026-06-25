import { defineEntity } from "@fyre-db/core"

/**
 * TagRule — a learned association between a recurring transaction key and the
 * tags users apply to it. Stored globally per tenant (single in-memory
 * partition, mirroring `tag`).
 *
 * `key` is `"upi:<handle>"` or `"sig:<hash>"`. `votes` counts explicit human
 * tags; `autoApplied` counts uncorrected auto-applies. Together they drive the
 * engine's confidence. `lastMatchedAt` gates dormancy.
 */
export type TagRule = {
  readonly key: string
  readonly upiId?: string
  readonly signature?: string
  readonly votes: Record<string, number>
  readonly autoApplied: Record<string, number>
  readonly sampleNarration: string
  readonly sourceAccountIds: readonly string[]
  readonly sourceAdapterIds: readonly string[]
  readonly lastMatchedAt: number
}

export const tagRuleEntity = defineEntity<TagRule>("tagRule", {
  keyStrategy: "global",
  deriveId: (r) => r.key,
})
