import { defineEntity } from "@fyre-db/core"
import { partitioned } from "@fyre-db/core"
import type { ImportSource } from "@/entities/import-source"

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
