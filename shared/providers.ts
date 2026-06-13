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

// sessionStorage
export const SESSION_KEY = "pai_auth_session"
export const FEATURE_CREDS_KEY = "pai_feature_creds"
export const RETURN_URL_KEY = "pai_return_url"

// HTTP cookies
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

// localStorage (via @fyre-db/plugins)
export const DEVICE_ID_KEY = "pai_device_id"
export const THEME_KEY = "pai_ui_theme"