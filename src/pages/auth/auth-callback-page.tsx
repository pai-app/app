import { useEffect } from "react"
import { useNavigate } from "react-router"
import { FEATURE_CREDS_KEY } from "@shared/providers"

/**
 * Callback page for feature auth flows. The server redirects here with
 * token data in the URL hash after a feature OAuth exchange.
 *
 * Reads the hash params, stores them in sessionStorage under
 * FEATURE_CREDS_KEY, then navigates back to the return URL.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) {
      navigate("/tenants", { replace: true })
      return
    }

    const params = new URLSearchParams(hash)
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")
    const expiresIn = params.get("expires_in")
    const feature = params.get("feature")
    const provider = params.get("provider")

    if (!accessToken || !refreshToken || !feature || !provider) {
      navigate("/tenants", { replace: true })
      return
    }

    const creds = {
      accessToken,
      refreshToken,
      expiresIn: expiresIn ? Number(expiresIn) : 3600,
      feature,
      provider,
      receivedAt: Date.now(),
    }

    sessionStorage.setItem(FEATURE_CREDS_KEY, JSON.stringify(creds))

    // Clear the hash to avoid leaking tokens in browser history
    window.history.replaceState(null, "", window.location.pathname)

    // Navigate to tenants — the user re-opens their workspace from there.
    // The home page will pick up the feature creds from sessionStorage.
    navigate("/tenants", { replace: true })
  }, [navigate])

  return null
}
