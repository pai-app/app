import { defineEntity } from "@strata/core"
import { partitioned } from "@strata/core"
import type { ImportLogSource } from "./import-log"

// ── Descriptor ──────────────────────────────────────────

/**
 * Identity of a single imported input — one email message or one file.
 * Structurally identical to `ImportLogSource`, reused here so there is a
 * single source-descriptor family across the import domain.
 */
export type ImportSourceDescriptor = ImportLogSource

// ── Entity ──────────────────────────────────────────────

/**
 * A single imported input (one email or one file) that produced transactions,
 * parented to its import run (`importLogId`). This is the per-input level the
 * run aggregate (`importLog`) cannot represent: an email sweep imports
 * statements from many senders/attachments in one run.
 *
 * `Transaction.sourceId` points here, so provenance is exact:
 * `transaction → importSource → importLog`.
 *
 * Created only for inputs that yielded ≥1 new transaction, so row count is
 * bounded by the run's imported count — never by mailbox size.
 *
 * Partitioned monthly by `createdAt` (aligns with `importLog` / `transaction`
 * partitioning). The composite id encodes the partition, so cross-partition
 * lookup from a transaction is unambiguous.
 */
export type ImportSource = {
  readonly importLogId: string                  // → importLogEntity.id (parent run)
  readonly importedAt: number                   // ms epoch — drives partition
  readonly adapterId?: string                   // resolved bank/offering adapter id
  readonly accountId?: string                   // resolved MoneyAccount id, if any
  readonly descriptor: ImportSourceDescriptor   // file | email identity
  readonly counts: {
    readonly parsed: number
    readonly new: number
    readonly duplicate: number
  }
}

/** YYYY-MM partition key derived from the import time (UTC, matching
 *  `transaction` / `importLog`). */
function monthKey(s: ImportSource): string {
  const d = new Date(s.importedAt)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export const importSourceEntity = defineEntity<ImportSource>("import-source", {
  keyStrategy: partitioned<ImportSource>(monthKey),
})

/** YYYY-MM partition key for a timestamp — for callers that need to scope a
 *  partitioned `query`/`observeQuery` to where a source row lives. */
export function importSourceMonthKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}
