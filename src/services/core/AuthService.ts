import { BehaviorSubject } from "rxjs"

export interface AuthState {
  status: "loading" | "authenticated" | "unauthenticated"
  provider?: string
  accessToken?: string
  expiresAt?: number
}

export interface FeatureCreds {
  provider: string
  feature: string
  accessToken: string
  refreshToken: string
  expiresIn: number
}

const SESSION_KEY = "fin_auth_session"
const FEATURE_CREDS_KEY = "fin_feature_creds"
const RETURN_URL_KEY = "fin_return_url"

function saveSession(provider: string, accessToken: string, expiresAt: number) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ provider, accessToken, expiresAt }))
}

function loadSession(): { provider: string; accessToken: string; expiresAt: number } | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

const authState$ = new BehaviorSubject<AuthState>({ status: "loading" })

export const AuthService = {
  state$: authState$.asObservable(),

  getState(): AuthState {
    return authState$.getValue()
  },

  login(provider: string) {
    AuthService.saveReturnUrl()
    window.location.href = `/api/auth/login?provider=${provider}`
  },

  async refresh(): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
      })

      if (!response.ok) {
        authState$.next({ status: "unauthenticated" })
        return null
      }

      const data = await response.json() as { access_token: string; expires_in: number; provider: string }
      const expiresAt = Date.now() + data.expires_in * 1000

      authState$.next({
        status: "authenticated",
        provider: data.provider,
        accessToken: data.access_token,
        expiresAt,
      })

      saveSession(data.provider, data.access_token, expiresAt)
      return data.access_token
    } catch {
      authState$.next({ status: "unauthenticated" })
      return null
    }
  },

  async getAccessToken(): Promise<string | null> {
    const state = authState$.getValue()

    if (!state.accessToken || !state.expiresAt) return null

    // Refresh if token expires in less than 5 minutes
    if (state.expiresAt - Date.now() < 5 * 60 * 1000) {
      return AuthService.refresh()
    }

    return state.accessToken
  },

  async logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    authState$.next({ status: "unauthenticated" })
    clearSession()
  },

  async tryRestoreSession() {
    // Try sessionStorage first (avoids network call)
    const cached = loadSession()
    if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) {
      authState$.next({
        status: "authenticated",
        provider: cached.provider,
        accessToken: cached.accessToken,
        expiresAt: cached.expiresAt,
      })
      return
    }

    await AuthService.refresh()
  },

  // --- Feature auth ---

  featureLogin(provider: string, feature: string) {
    AuthService.saveReturnUrl()
    window.location.href = `/api/auth/login?provider=${provider}&feature=${feature}`
  },

  saveFeatureCreds(creds: FeatureCreds) {
    sessionStorage.setItem(FEATURE_CREDS_KEY, JSON.stringify(creds))
  },

  consumeFeatureCreds(): FeatureCreds | null {
    const raw = sessionStorage.getItem(FEATURE_CREDS_KEY)
    if (!raw) return null
    sessionStorage.removeItem(FEATURE_CREDS_KEY)
    try {
      return JSON.parse(raw) as FeatureCreds
    } catch {
      return null
    }
  },

  async refreshFeatureToken(provider: string, refreshToken: string): Promise<FeatureCreds | null> {
    try {
      const response = await fetch("/api/auth/feature/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, refresh_token: refreshToken }),
      })

      if (!response.ok) return null

      const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number }
      return {
        provider,
        feature: "",
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      }
    } catch {
      return null
    }
  },

  async revokeFeatureToken(provider: string, token: string): Promise<void> {
    await fetch("/api/auth/feature/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, token }),
    })
  },

  // --- Return URL ---

  saveReturnUrl() {
    sessionStorage.setItem(RETURN_URL_KEY, window.location.pathname + window.location.search)
  },

  consumeReturnUrl(): string {
    const url = sessionStorage.getItem(RETURN_URL_KEY)
    sessionStorage.removeItem(RETURN_URL_KEY)
    return url ?? "/"
  },
}
