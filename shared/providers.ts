/**
 * Shared constants between the browser app and the Cloudflare Worker.
 * Per PLUGGABLES_V2 §4 + §6 — endpoints/scopes are owned by the adapters
 * package; here we only declare app-level identifiers.
 */
export const GOOGLE_AUTH_NAME = "google"
export const MICROSOFT_AUTH_NAME = "microsoft"
export const AUTH_BASE_PREFIX = "/api/auth"
/** OAuth redirect path, appended to the request origin to form `redirect_uri`. */
export const AUTH_CALLBACK_PATH = `${AUTH_BASE_PREFIX}/callback`

// ─── Browser storage keys — single source of truth ──────────────────────────
// Every localStorage / sessionStorage / cookie name the app uses lives here and
// is passed explicitly into the relevant service. Nothing should hard-code a
// storage key elsewhere.

// sessionStorage
export const SESSION_KEY = "pai_auth_session"        // FyreDbApp credential cache
export const FEATURE_CREDS_KEY = "pai_feature_creds" // ClientAuthService one-shot OAuth creds
export const RETURN_URL_KEY = "pai_return_url"       // ClientAuthService post-login return URL
export const TX_FILTER_KEY_PREFIX = "pai:tx-filter:" // transactions page filter (per tenant)

// HTTP cookies (set by the Worker)
export const REFRESH_COOKIE = "pai_refresh"
export const CSRF_COOKIE = "pai_csrf"

// Feature scopes (email import)
export const GOOGLE_EMAIL_SCOPES: readonly string[] = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "email",
  "profile",
] as const

export const MICROSOFT_EMAIL_SCOPES: readonly string[] = [
  "offline_access",
  "User.Read",
  "Mail.Read",
] as const

// localStorage (device id passed into FyreDbApp; theme owned by the app)
export const DEVICE_ID_KEY = "pai_device_id"
export const THEME_KEY = "pai_ui_theme"