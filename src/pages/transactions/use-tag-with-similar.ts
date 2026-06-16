import { toast } from "sonner"
import { useTransactionService } from "@/providers/entity-provider"

/**
 * Tagging helper that consumes the `similar` fact returned by the
 * `TransactionService` and surfaces the design's "tag the others?" offer.
 *
 * Per auto-tagging design §8.1/§8.2 the first mark is silent — the row is
 * tagged immediately by `tag` — and the follow-up offer is a quiet,
 * non-blocking, dismissable sonner toast (action = "Tag all N"; dismissing it
 * means "just this one"). `untag` never prompts.
 */
export function useTagWithSimilar() {
  const txService = useTransactionService()

  const tag = (txId: string, tagId: string, tagName: string): void => {
    const { similar } = txService.tag(txId, tagId)
    const n = similar?.transactionIds.length ?? 0
    if (similar && n > 0) {
      toast(`Tag ${n} similar ${n === 1 ? "transaction" : "transactions"} as ${tagName} too?`, {
        action: {
          label: `Tag all ${n}`,
          onClick: () => { txService.tagMany(similar.transactionIds, similar.tagId) },
        },
      })
    }
  }

  const untag = (txId: string): void => { txService.untag(txId) }

  return { tag, untag }
}
