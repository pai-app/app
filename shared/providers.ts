/**
 * Shared constants between the browser app and the Cloudflare Pages worker.
 * Per PLUGGABLES_V2 §4 + §6 — endpoints/scopes are owned by the adapters
 * package; here we only declare app-level identifiers.
 */
export const GOOGLE_AUTH_NAME = "google"
export const GOOGLE_AUTH_LABEL = "Google Drive"
export const AUTH_BASE_PREFIX = "/api/auth"