/**
 * Shared constants between the browser app and the Cloudflare Pages worker.
 * Per PLUGGABLES_V2 §4 + §6 — endpoints/scopes are owned by the adapters
 * package; here we only declare app-level identifiers.
 */
export const GOOGLE_AUTH_NAME = "google"
export const MICROSOFT_AUTH_NAME = "microsoft"
export const AUTH_BASE_PREFIX = "/api/auth"

// sessionStorage
export const SESSION_KEY = "fin_auth_session"
export const FEATURE_CREDS_KEY = "fin_feature_creds"
export const RETURN_URL_KEY = "fin_return_url"

// HTTP cookies
export const REFRESH_COOKIE = "fin_refresh"
export const CSRF_COOKIE = "fin_csrf"

// localStorage (via strata-adapters)
export const DEVICE_ID_KEY = "fin_device_id"
export const THEME_KEY = "fin_ui_theme"