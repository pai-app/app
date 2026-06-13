import { clientAuth } from "@/lib/fyredb-config"
import type { AuthAccount } from "@/services/entities"

/** Refresh a token a little before it actually expires, to avoid races. */
const EXPIRY_MARGIN_MS = 60_000
/** Fallback lifetime when the provider doesn't report `expiresAt`. */
const DEFAULT_TTL_MS = 5 * 60_000

/**
 * Per-account feature-token cache. `ClientAuthService.getFeatureToken` does a
 * network round-trip on every call, so without caching a mailbox sweep would
 * refresh once per email. One cache lives on each `MailProvider` instance and
 * is reused across all its calls; the token is refreshed only when missing or
 * within `EXPIRY_MARGIN_MS` of expiry.
 */
export class MailTokenCache {
  private token: string | null = null
  private expiresAt = 0
  private readonly account: AuthAccount

  constructor(account: AuthAccount) {
    this.account = account
  }

  async get(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - EXPIRY_MARGIN_MS) {
      return this.token
    }
    const result = await clientAuth.getFeatureToken(
      this.account.provider,
      this.account.feature,
      this.account.refreshToken,
    )
    if (!result) throw new Error("Failed to refresh feature token")
    this.token = result.token
    this.expiresAt = result.expiresAt ?? Date.now() + DEFAULT_TTL_MS
    return result.token
  }
}
