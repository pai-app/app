import { useEffect, useState } from "react"
import type { BaseEntity } from "@fyre-db/core"
import { useFyreDb } from "@fyre-db/plugins-ui"
import { tagRuleEntity, type TagRule } from "@/services/entities"
import { useTenantReady } from "@/providers/use-tenant-ready"

export type TagRuleRow = TagRule & BaseEntity

/**
 * Internal hook — subscribes to all `TagRule` rows for the active tenant.
 * Keeping the global `tagRule` partition live before the first engine op is
 * load-bearing (INV-1): if `ruleByKey` misses a rule that exists on disk, the
 * engine materializes a partial rule under the same key and LWW clobbers the
 * rich on-disk version. Only consumed by `<EntityProvider>`.
 */
export function useLoadTagRules(): readonly TagRuleRow[] {
  const fyredb = useFyreDb()
  const ready = useTenantReady()
  const [tagRules, setTagRules] = useState<readonly TagRuleRow[]>([])

  useEffect(() => {
    if (!fyredb || !ready) return
    const repo = fyredb.repo(tagRuleEntity)
    const sub = repo.observeQuery().subscribe(setTagRules)
    return () => { sub.unsubscribe() }
  }, [fyredb, ready])

  return tagRules
}
