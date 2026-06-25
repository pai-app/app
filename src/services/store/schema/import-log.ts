import { defineEntity } from "@fyre-db/core"
import { partitioned } from "@fyre-db/core"
import type { ImportLog } from "@/entities/import-log"

function monthKey(l: ImportLog): string {
  const d = new Date(l.triggeredAt)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export const importLogEntity = defineEntity<ImportLog>("import-log", {
  keyStrategy: partitioned<ImportLog>(monthKey),
})
