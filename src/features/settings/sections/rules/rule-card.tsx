import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { tagIconName } from "@/catalog/icon-resolve"
import { classify, isDormant, strengthOf } from "@/services/tagging/strength"
import { cn } from "@/lib/utils"
import type { TagRuleRow } from "@/services/transactions-service"
import type { TagView } from "@/views/tag-view"

type RuleCardProps = {
  readonly rule: TagRuleRow
  readonly now: number
  readonly tagsById: ReadonlyMap<string, TagView>
  readonly onDelete: () => void
}

type Status = {
  readonly label: string
  readonly dotClass: string
  readonly hint: string
}

/**
 * A read-only, compact row for one tag rule. Leads with what it tags (winning
 * tag + the matcher hint that makes it legible) and how much it has helped
 * (auto-tag count), with a single Active / Learning / Dormant status — the
 * end-user questions "what does this tag, and is it working?".
 */
export function RuleCard({ rule, now, tagsById, onDelete }: RuleCardProps) {
  const { winner } = strengthOf(rule)
  const winnerTag = winner ? tagsById.get(winner) : undefined
  const auto = rule.autoApplied[winner ?? ""] ?? 0
  const votes = rule.votes[winner ?? ""] ?? 0
  const status = statusOf(rule, now)
  const hint = matcherHint(rule)

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {winnerTag ? (
            <>
              <Icon name={tagIconName(winnerTag)} className="size-4 shrink-0" />
              <span className="truncate">{winnerTag.name}</span>
            </>
          ) : (
            <span className="truncate text-muted-foreground">{winner ?? "—"}</span>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground" title={hint}>
          {hint}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <div className="text-xs">
          {auto > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Icon name="sparkles" aria-hidden className="size-3 text-muted-foreground" />
              {auto} auto-tagged
            </span>
          ) : (
            <span className="text-muted-foreground">{votes} tagged</span>
          )}
        </div>
        <div
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          title={status.hint}
        >
          <span className={cn("size-1.5 rounded-full", status.dotClass)} aria-hidden />
          {status.label}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={onDelete}
        aria-label="Delete rule"
      >
        <Icon name="trash-2" className="size-4 text-muted-foreground" />
      </Button>
    </div>
  )
}

/** The human-legible "what does this match" line: matcher kind + a sample. */
function matcherHint(rule: TagRuleRow): string {
  if (rule.upiId) return `UPI · ${rule.upiId}`
  const sample = rule.sampleNarration.trim() || rule.signature || ""
  return sample ? `Text · ${sample}` : "Text"
}

/**
 * Collapses the engine's classification into one end-user status:
 * **Active** (established → auto-applies), **Dormant** (aged out of
 * auto-apply), or **Learning** (provisional — still gathering evidence).
 */
function statusOf(rule: TagRuleRow, now: number): Status {
  if (isDormant(rule, now)) {
    return {
      label: "Dormant",
      dotClass: "bg-muted-foreground/40",
      hint: "Hasn't matched in a long time — won't auto-tag until it matches again.",
    }
  }
  if (classify(rule, now) === "established") {
    return {
      label: "Active",
      dotClass: "bg-emerald-500",
      hint: "Trusted — auto-tags matching transactions on import.",
    }
  }
  return {
    label: "Learning",
    dotClass: "bg-amber-500",
    hint: "Still gathering evidence — suggests but won't auto-tag yet.",
  }
}
