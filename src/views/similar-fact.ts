/** Untagged look-alikes the app MAY prompt to bulk-tag (loaded partitions only). */
export type SimilarFact = {
  readonly tagId: string
  readonly transactionIds: readonly string[]
}
