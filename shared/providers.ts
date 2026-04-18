import type { ScopeMap } from "strata-adapters"
import { GOOGLE_OAUTH } from "./google-oauth"

/** Pure OAuth identity data — safe to import from server and client. */
export type ProviderPublic = {
  readonly name: string
  readonly authUrl: string
  readonly tokenUrl: string
  readonly revokeUrl: string
  readonly scopes: ScopeMap
}

/** Names of env vars that hold the server secrets for a provider. */
export type ProviderEnvKeys = {
  readonly clientId: string
  readonly clientSecret: string
  readonly callbackUrl: string
}

export type ProviderEntry = {
  readonly public: ProviderPublic
  readonly envKeys: ProviderEnvKeys
}

/**
 * Single source of truth for OAuth providers.
 * Add a new provider by appending an entry here and wiring its
 * client-side factories in `src/lib/strata-config.ts`.
 */
export const PROVIDERS: readonly ProviderEntry[] = [
  {
    public: GOOGLE_OAUTH,
    envKeys: {
      clientId: "GOOGLE_CLIENT_ID",
      clientSecret: "GOOGLE_CLIENT_SECRET",
      callbackUrl: "GOOGLE_CALLBACK_URL",
    },
  },
]
