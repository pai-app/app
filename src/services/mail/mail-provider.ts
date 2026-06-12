import type { MailMessage } from "@pai-app/adapters"
import type { EmailPreview } from "@/services/email-types"

// ── Cursors & summaries ─────────────────────────────────

/** A precise position in a mailbox timeline — date narrows the query, id pins
 *  the exact message within a day. */
export type MailCursor = {
  readonly date: number              // ms epoch
  readonly id: string
}

/** Lightweight message header — enough to match an adapter and checkpoint. */
export type EmailSummary = {
  readonly id: string
  readonly subject: string
  readonly from: string
  readonly date: number              // ms epoch
  readonly snippet: string
  readonly hasAttachments: boolean
}

// ── Listing ─────────────────────────────────────────────

/** Match keys for a listing — server-side filters. */
export type MailQuery = {
  readonly subject?: string
  readonly domains?: readonly string[]
}

export type MailListOptions = {
  readonly query: MailQuery
  /** Only messages received on/before this cursor (walk backward in time). */
  readonly before?: MailCursor
  /** Provider page token continuing a previous listing. */
  readonly pageToken?: string
}

/** One page of message summaries, newest-first. */
export type MailListPage = {
  readonly messages: ReadonlyArray<EmailSummary>
  readonly nextPageToken?: string
}

// ── Provider ────────────────────────────────────────────

/**
 * Provider-agnostic mailbox access. Isolates the email-sync logic from the
 * Gmail / Microsoft Graph APIs: the sweep depends only on this contract, and
 * adding a provider means implementing it once.
 *
 * An instance is bound to a single connected account (created via
 * `getMailProvider`); methods need no account argument.
 */
export interface MailProvider {
  /** Provider identifier (e.g. the auth name). */
  readonly name: string
  /** List one page of message summaries matching `query`, newest-first. */
  listMessages(opts: MailListOptions): Promise<MailListPage>
  /** Fetch a full message with decoded attachment bytes, for parsing. */
  fetchMessage(id: string): Promise<MailMessage>
  /** Fetch lightweight display metadata — no attachment bytes. */
  fetchPreview(id: string): Promise<EmailPreview>
}
