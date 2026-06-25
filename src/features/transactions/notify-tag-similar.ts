import { toast } from "sonner"
import type { SimilarFact } from "@/views/similar-fact"
import type { TransactionsService } from "@/services/transactions-service"

/**
 * Surface the design's quiet "tag the others?" offer for a `similar` fact.
 *
 * Per auto-tagging design §8.1/§8.2 the first mark is silent — the row is
 * tagged immediately by `tag` — and the follow-up offer is a quiet,
 * non-blocking, dismissable sonner toast (action = "Tag all N"; dismissing it
 * means "just this one"). No-op when there are no untagged look-alikes.
 */
export function notifyTagSimilar(
  similar: SimilarFact | undefined,
  tagName: string,
  svc: TransactionsService,
): void {
  const n = similar?.transactionIds.length ?? 0
  if (!similar || n === 0) return
  toast(`Tag ${n} similar ${n === 1 ? "transaction" : "transactions"} as ${tagName} too?`, {
    action: {
      label: `Tag all ${n}`,
      onClick: () => { svc.tagMany(similar.transactionIds, similar.tagId) },
    },
  })
}
