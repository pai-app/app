import { defineEntity } from "@strata/core"
import { partitioned } from "@strata/core"

// ── Status & trigger ────────────────────────────────────

export type ImportLogStatus =
  | "pending"
  | "in_progress"
  | "needs_input"
  | "completed"
  | "failed"
  | "cancelled"

/** How the import was initiated. Extensible for future `'background'`. */
export type ImportLogTrigger = "manual"

// ── Source descriptors ──────────────────────────────────

export type ImportLogFileSource = {
  readonly kind: "file"
  readonly fileName: string
  readonly fileType?: string         // mime
  readonly fileSize?: number         // bytes
}

export type ImportLogEmailSource = {
  readonly kind: "email"
  readonly authAccountId: string     // → authAccountEntity.id
  readonly emailId: string           // provider message id
  readonly receivedAt: number        // ms epoch
  readonly from: string
  readonly subject: string
}

export type ImportLogSource = ImportLogFileSource | ImportLogEmailSource

// ── Prompt payloads ─────────────────────────────────────

/** What the UI should render when `status === 'needs_input'`. */
export type ImportPromptPayload =
  | { readonly kind: "password" }
  | { readonly kind: "adapter-selection"; readonly adapterIds: ReadonlyArray<string> }
  | { readonly kind: "account-selection"; readonly accountIds: ReadonlyArray<string> }
  | { readonly kind: "confirm"; readonly parsed: number; readonly newCount: number; readonly duplicate: number }

// ── Error ───────────────────────────────────────────────

export type ImportLogError = {
  readonly kind: string              // ParseError.kind or 'network' | 'auth' | 'abandoned' | 'unknown'
  readonly message: string
  readonly adapterIdHint?: string
}

// ── Entity ──────────────────────────────────────────────

/**
 * Per-trigger record of an import attempt. Every transaction created by
 * the importer references one of these via `Transaction.activityLogId`.
 *
 * Partitioned monthly by `triggeredAt`. The Strata composite id
 * (`import-log.<YYYY-MM>.<uid>`) encodes the partition, so cross-partition
 * lookup from a transaction is unambiguous.
 */
export type ImportLog = {
  readonly trigger: ImportLogTrigger
  readonly triggeredAt: number                             // ms epoch — drives partition
  readonly completedAt?: number                            // ms epoch
  readonly status: ImportLogStatus
  readonly source: ImportLogSource
  readonly adapterId?: string                              // resolved bank/offering adapter id
  readonly touchedAccountIds: ReadonlyArray<string>        // MoneyAccount ids written to
  readonly counts: {
    readonly parsed: number
    readonly new: number
    readonly duplicate: number
  }
  /** Present only for email sweep runs — not for single-email or file runs. */
  readonly emailRun?: {
    readonly windowStart: number                           // ms epoch
    readonly windowEnd: number                             // ms epoch
    readonly readEmailCount: number
    readonly importedEmailCount: number
  }
  readonly error?: ImportLogError
  /** Present iff `status === 'needs_input'`. */
  readonly prompt?: ImportPromptPayload
}

function monthKey(l: ImportLog): string {
  const d = new Date(l.triggeredAt)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export const importLogEntity = defineEntity<ImportLog>("import-log", {
  keyStrategy: partitioned<ImportLog>(monthKey),
})
