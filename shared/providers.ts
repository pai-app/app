import { defineProvider } from "strata-adapters"

/**
 * Single source of truth for OAuth providers — used by both the client
 * (`defineStrata`) and the server (`defineOAuthHandlers`).
 *
 * Add a new login provider by appending a `defineProvider(...)` entry.
 * Server-side credentials (clientId / clientSecret / callbackUrl) are
 * resolved at request time from env vars: `${NAME_UPPER}_CLIENT_ID`,
 * `${NAME_UPPER}_CLIENT_SECRET`, `${NAME_UPPER}_CALLBACK_URL`.
 */
export const PROVIDERS = [
  defineProvider("google")
    .google()
    .feature("email-import", {
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    })
    .label("Google")
    .build(),
] as const

