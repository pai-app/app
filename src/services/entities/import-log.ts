import { defineEntity } from "@fyre-db/core"
import { partitioned } from "@fyre-db/core"

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
 * Per-trigger record of an import attempt (the **run** aggregate). Individual
 * imported inputs (emails/files) become `importSource` rows parented to this
 * log; transactions link to those sources, not directly to the log.
 *
 * Partitioned monthly by `triggeredAt`. The FyreDb composite id
 * (`import-log.<YYYY-MM>.<uid>`) encodes the partition, so cross-partition
 * lookup is unambiguous.
 */
export type ImportLog = {
  readonly trigger: ImportLogTrigger
  readonly triggeredAt: number                             // ms epoch — drives partition
  readonly completedAt?: number                            // ms epoch
  readonly status: ImportLogStatus
  readonly source: ImportLogSource
  readonly adapterId?: string                              // resolved bank/offering adapter id
  readonly touchedAccountIds: ReadonlyArray<string>        // MoneyAccount ids written to
  /** Accumulated as transactions commit (not just at the end), so partial
   *  progress survives cancel / crash / reload. */
  readonly counts: {
    readonly parsed: number
    readonly new: number
    readonly duplicate: number
  }
  /** Present only for email sweep runs. Updated per page during the sweep so
   *  the surface can render a live time-progress bar. The cursor walks
   *  newest → oldest, so `cursorAt` decreases from `newestAt` toward
   *  `targetAt` (when known). */
  readonly emailRun?: ImportLogEmailRun
  readonly error?: ImportLogError
  /** Present iff `status === 'needs_input'`. */
  readonly prompt?: ImportPromptPayload
}

/** Live email-sweep progress. The UI derives a percent from
 *  `(newestAt - cursorAt) / (newestAt - targetAt)`; `targetAt` is absent during
 *  the first full backfill (no known floor → indeterminate bar). */
export type ImportLogEmailRun = {
  readonly newestAt: number          // ms epoch — run's newest email (0% anchor)
  readonly cursorAt: number          // ms epoch — checkpoint reached (live fill)
  readonly targetAt?: number         // ms epoch — window floor (100% anchor)
  readonly scanned: number           // emails read so far
  readonly imported: number          // emails that produced data
  readonly currentFrom?: string      // sender of the email in flight (transient)
}

/**
 * Derive a progress-bar value (0–1) from an email-sweep run.
 *
 * - **Exact** when a usable floor exists (`targetAt` known and *older* than
 *   `newestAt`): pure date-based fraction of the time-window traversed. The
 *   cursor walks newest → oldest, so it fills as `cursorAt` descends toward
 *   `targetAt`.
 * - **Estimated** otherwise — the first full backfill (no floor), or a run that
 *   blew past an unreachable / corrupt high-water mark (`targetAt >= newestAt`).
 *   We can't compute a true percentage, so we fake a monotonic fill from the
 *   scan count: it advances every page and asymptotically approaches (but never
 *   reaches) 100% until the run completes.
 *
 * `estimated` lets the UI label the two modes differently.
 */
export function sweepProgress(
  run: ImportLogEmailRun,
  live: boolean,
): { readonly value: number; readonly estimated: boolean } {
  const { newestAt, cursorAt, targetAt, scanned } = run
  if (!live) return { value: 1, estimated: false }
  if (targetAt !== undefined && targetAt < newestAt) {
    const v = (newestAt - cursorAt) / (newestAt - targetAt)
    return { value: Math.max(0, Math.min(1, v)), estimated: false }
  }
  return { value: 1 - Math.exp(-scanned / 200), estimated: true }
}

function monthKey(l: ImportLog): string {
  const d = new Date(l.triggeredAt)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export const importLogEntity = defineEntity<ImportLog>("import-log", {
  keyStrategy: partitioned<ImportLog>(monthKey),
})
