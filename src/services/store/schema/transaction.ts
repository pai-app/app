import { defineEntity } from "@fyre-db/core"
import { partitioned } from "@fyre-db/core"
import type { Transaction } from "@/entities/transaction"

/** YYYY-MM partition key derived from the transaction date. */
function monthKey(t: Transaction): string {
  const d = new Date(t.transactionAt)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export const transactionEntity = defineEntity<Transaction>("transaction", {
  keyStrategy: partitioned<Transaction>(monthKey),
  // Use the hash as the entity id so importing the same statement twice
  // upserts the same row instead of creating duplicates. Manual entries
  // are responsible for supplying their own hash (e.g. uuid).
  deriveId: (t) => t.hash,
})
