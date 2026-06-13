import type { AuthAccount } from "@/services/entities"
import { MICROSOFT_AUTH_NAME } from "@shared/providers"
import { GmailProvider } from "./gmail-provider"
import { OutlookProvider } from "./outlook-provider"
import type { MailProvider } from "./mail-provider"

export type {
  MailProvider,
  MailCursor,
  MailQuery,
  MailListOptions,
  MailListPage,
  EmailSummary,
} from "./mail-provider"

/**
 * Resolve the `MailProvider` for a connected account, routed by
 * `account.provider`. This is the single seam between the email-sync logic and
 * the underlying Gmail / Microsoft Graph APIs.
 */
export function getMailProvider(account: AuthAccount): MailProvider {
  return account.provider === MICROSOFT_AUTH_NAME
    ? new OutlookProvider(account)
    : new GmailProvider(account)
}
