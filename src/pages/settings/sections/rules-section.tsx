import { useMemo, useState } from "react"
import { useFyreDb } from "@fyre-db/plugins-ui"
import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
import { tagRuleEntity } from "@/services/entities"
import { isDormant, strengthOf } from "@/services/tagging/strength"
import { useEntity, type AccountRow, type TagRuleRow } from "@/providers/entity-provider"
import { RuleCard } from "./rules/rule-card"

type SortKey = "lastMatched" | "evidence"

const SORT_LABELS: Record<SortKey, string> = {
  lastMatched: "Last matched",
  evidence: "Evidence",
}

/**
 * Read-only Rules UI (v1). Lists every learned tag rule with its winning tag,
 * strength breakdown, matcher type, provenance, and last-matched age. Allowed
 * actions are view / delete / prune only — no "Recompute strength" (D4) and no
 * "Apply rules to all" sweep (D6). Deleting a rule only stops future
 * auto-tagging; it never untags existing transactions.
 */
export function RulesSection() {
  const fyredb = useFyreDb()
  const { tagRules, tags, accounts } = useEntity()
  const [sort, setSort] = useState<SortKey>("lastMatched")

  // UI may read the clock (only the engine may not). Reading it once via a
  // state initializer keeps dormancy/age comparisons consistent across all
  // cards and avoids an impure call during render.
  const [now] = useState(() => Date.now())

  const tagsById = useMemo(() => indexById(tags), [tags])
  const accountsById = useMemo(() => indexById(accounts), [accounts])

  const sortedRules = useMemo(() => {
    const rows = [...tagRules]
    if (sort === "evidence") {
      rows.sort((a, b) => strengthOf(b).evidence - strengthOf(a).evidence)
    } else {
      rows.sort((a, b) => b.lastMatchedAt - a.lastMatchedAt)
    }
    return rows
  }, [tagRules, sort])

  const archivedRuleIds = useMemo(
    () => tagRules.filter((r) => isFromArchivedAccount(r, accountsById)).map((r) => r.id),
    [tagRules, accountsById],
  )
  const dormantRuleIds = useMemo(
    () => tagRules.filter((r) => isDormant(r, now)).map((r) => r.id),
    [tagRules, now],
  )

  const deleteRules = (ids: readonly string[]) => {
    if (!fyredb || ids.length === 0) return
    const repo = fyredb.repo(tagRuleEntity)
    for (const id of ids) repo.delete(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Icon name="arrow-down-wide-narrow" className="size-4" />
              Sort: {SORT_LABELS[sort]}
              <Icon name="chevron-down" className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => { setSort(value as SortKey) }}
            >
              <DropdownMenuRadioItem value="lastMatched">Last matched</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="evidence">Evidence</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {(dormantRuleIds.length > 0 || archivedRuleIds.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Prune rules">
                <Icon name="ellipsis" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dormantRuleIds.length > 0 && (
                <DropdownMenuItem onClick={() => { deleteRules(dormantRuleIds) }}>
                  Prune dormant ({dormantRuleIds.length})
                </DropdownMenuItem>
              )}
              {archivedRuleIds.length > 0 && (
                <DropdownMenuItem onClick={() => { deleteRules(archivedRuleIds) }}>
                  Prune from archived accounts ({archivedRuleIds.length})
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {sortedRules.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No tag rules yet. Rules are learned automatically as you tag recurring
          transactions, then used to auto-tag future imports.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {sortedRules.map((rule) => (
          <RuleCard
            key={rule.key}
            rule={rule}
            now={now}
            tagsById={tagsById}
            onDelete={() => { deleteRules([rule.id]) }}
          />
        ))}
      </div>
    </div>
  )
}

/** Indexes rows by their `id` for O(1) lookup in the card. */
function indexById<T extends { readonly id: string }>(rows: readonly T[]): ReadonlyMap<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

/**
 * True when a rule was learned only from archived accounts: it carries at least
 * one source account and every resolved source account is archived. Rules whose
 * source ids no longer resolve are left untouched (not treated as archived).
 */
function isFromArchivedAccount(
  rule: TagRuleRow,
  accountsById: ReadonlyMap<string, AccountRow>,
): boolean {
  if (rule.sourceAccountIds.length === 0) return false
  return rule.sourceAccountIds.every((id) => accountsById.get(id)?.archived === true)
}
