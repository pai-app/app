import type { AuthAccount } from "@/services/entities/auth-account"
import { MICROSOFT_AUTH_NAME } from "@shared/providers"
import { fetchGmailPreview } from "@/services/gmail"
import { fetchOutlookPreview } from "@/services/outlook"
import type { EmailPreview } from "@/services/email-types"

export type { EmailAttachmentMeta, EmailPreview } from "@/services/email-types"

// ── Dispatcher ──────────────────────────────────────────

/**
 * Fetch lightweight email metadata for display — no attachment bytes.
 * Routes to the correct provider by `account.provider`.
 */
export async function fetchEmailPreview(
  account: AuthAccount,
  emailId: string,
): Promise<EmailPreview> {
  return account.provider === MICROSOFT_AUTH_NAME
    ? fetchOutlookPreview(account, emailId)
    : fetchGmailPreview(account, emailId)
}
