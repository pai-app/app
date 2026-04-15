import { BehaviorSubject, map } from "rxjs"
import type { AuthAdapter } from "strata-adapters"
import { SESSION_KEY, FEATURE_CREDS_KEY, RETURN_URL_KEY } from "@/lib/storage-keys"

export type AuthState = {
  readonly status: "loading" | "authenticated" | "unauthenticated"
  readonly provider?: string
  readonly accessToken?: string
  readonly expiresAt?: number
}

export type FeatureCreds = {
  readonly provider: string
  readonly feature: string
  readonly accessToken: string
  readonly refreshToken: string
  readonly expiresIn: number
}

class AuthServiceImpl {
  private readonly authState$ = new BehaviorSubject<AuthState>({ status: "loading" })

  readonly state$ = this.authState$.asObservable()

  getState(): AuthState {
    return this.authState$.getValue()
  }

  login(provider: string) {
    this.saveReturnUrl()
    window.location.href = `/api/auth/login?provider=${provider}`
  }

  async refresh(): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
      })

      if (!response.ok) {
        this.authState$.next({ status: "unauthenticated" })
        return null
      }

      // Response is untyped JSON from our backend API
      const data = await response.json() as { access_token: string; expires_in: number; provider: string }
      const expiresAt = Date.now() + data.expires_in * 1000

      this.authState$.next({
        status: "authenticated",
        provider: data.provider,
        accessToken: data.access_token,
        expiresAt,
      })

      this.saveSession(data.provider, data.access_token, expiresAt)
      return data.access_token
    } catch {
      this.authState$.next({ status: "unauthenticated" })
      return null
    }
  }

  async getAccessToken(): Promise<string | null> {
    const state = this.authState$.getValue()

    if (!state.accessToken || !state.expiresAt) return null

    // Refresh if token expires in less than 5 minutes
    if (state.expiresAt - Date.now() < 5 * 60 * 1000) {
      return this.refresh()
    }

    return state.accessToken
  }

  async logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    this.authState$.next({ status: "unauthenticated" })
    this.clearSession()
  }

  async tryRestoreSession() {
    // Try sessionStorage first (avoids network call)
    const cached = this.loadSession()
    if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) {
      this.authState$.next({
        status: "authenticated",
        provider: cached.provider,
        accessToken: cached.accessToken,
        expiresAt: cached.expiresAt,
      })
      return
    }

    await this.refresh()
  }

  // --- Feature auth ---

  featureLogin(provider: string, feature: string) {
    this.saveReturnUrl()
    window.location.href = `/api/auth/login?provider=${provider}&feature=${feature}`
  }

  saveFeatureCreds(creds: FeatureCreds) {
    sessionStorage.setItem(FEATURE_CREDS_KEY, JSON.stringify(creds))
  }

  consumeFeatureCreds(): FeatureCreds | null {
    const raw = sessionStorage.getItem(FEATURE_CREDS_KEY)
    if (!raw) return null
    sessionStorage.removeItem(FEATURE_CREDS_KEY)
    try {
      // Stored by saveFeatureCreds — shape is known
      return JSON.parse(raw) as FeatureCreds
    } catch {
      return null
    }
  }

  async refreshFeatureToken(provider: string, refreshToken: string): Promise<FeatureCreds | null> {
    try {
      const response = await fetch("/api/auth/feature/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, refresh_token: refreshToken }),
      })

      if (!response.ok) return null

      // Response is untyped JSON from our backend API
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
  }

  async revokeFeatureToken(provider: string, token: string): Promise<void> {
    await fetch("/api/auth/feature/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, token }),
    })
  }

  // --- Return URL ---

  saveReturnUrl() {
    sessionStorage.setItem(RETURN_URL_KEY, window.location.pathname + window.location.search)
  }

  consumeReturnUrl(): string {
    const url = sessionStorage.getItem(RETURN_URL_KEY)
    sessionStorage.removeItem(RETURN_URL_KEY)
    return url ?? "/"
  }

  toAuthAdapter(): AuthAdapter {
    return {
      state$: this.authState$.pipe(map(s => s.status)),
      getAccessToken: () => this.getAccessToken(),
    }
  }

  // --- Private helpers ---

  private saveSession(provider: string, accessToken: string, expiresAt: number) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ provider, accessToken, expiresAt }))
  }

  private loadSession(): { provider: string; accessToken: string; expiresAt: number } | null {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  private clearSession() {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

export const authService = new AuthServiceImpl()
