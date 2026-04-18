import type { FeatureMap } from "strata-adapters"

/** Provider name used everywhere — registry key, OAuth `provider` query param, AuthState.provider. */
export const GOOGLE_PROVIDER_NAME = "google"

const FEATURES: FeatureMap = {
  login: {
    scopes: [
      "openid", "email", "profile",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.appdata",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  },
  "email-import": {
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
  },
}

/** Pure OAuth identity data — safe to import from server and client. Secrets are merged in by the server at request time. */
export const GOOGLE_OAUTH = {
  name: GOOGLE_PROVIDER_NAME,
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  revokeUrl: "https://oauth2.googleapis.com/revoke",
  features: FEATURES,
} as const
