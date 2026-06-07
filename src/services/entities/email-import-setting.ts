import { defineEntity } from "@strata/core"

// ── Sliding-window cursor ───────────────────────────────

/** Ported from old EmailImportProcessContext — marks a position in the
 *  email timeline so successive sweeps don't re-scan. */
export type EmailImportCursor = {
  readonly date: number              // ms epoch
  readonly emailId?: string          // tiebreaker within a day
}

export type EmailImportState = {
  /** Newest point already scanned. Next sweep continues forward from here. */
  readonly currentPoint?: EmailImportCursor
  /** Oldest point of the initial back-fill window. Sweeps walk back to here. */
  readonly endPoint?: EmailImportCursor
  readonly lastImportAt?: number     // ms epoch
}

// ── Entity ──────────────────────────────────────────────

/**
 * Per-connected-account import configuration. Global — one row per
 * `authAccountId`. No `intervalMinutes` field yet (sync is manual);
 * add it when background sync ships.
 */
export type EmailImportSetting = {
  readonly authAccountId: string     // → authAccountEntity.id (also the entity id)
  readonly paused: boolean
  readonly importState: EmailImportState
  /** Composite `importLog` id of the last failed run. Presence drives
   *  "Resolve" in the UI and is cleared on next successful run. */
  readonly lastErrorLogId?: string
}

export const emailImportSettingEntity = defineEntity<EmailImportSetting>(
  "email-import-setting",
  {
    keyStrategy: "global",
    // authAccountId is a Strata composite id (e.g. "auth-account._.google:email:123")
    // which contains dots — dots are reserved as Strata key separators, so replace them.
    deriveId: (s) => s.authAccountId.replaceAll(".", "-"),
  },
)
