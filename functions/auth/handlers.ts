import { getProviderConfig, type OAuthProviderConfig, type OAuthTokenResponse } from "./providers"
import { generateState, parseState, jsonResponse, errorResponse, setCookieHeader, clearCookieHeader, getCookie } from "./utils"
import { REFRESH_COOKIE } from "../../src/lib/storage-keys"

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const provider = url.searchParams.get("provider")
  if (!provider) return errorResponse("Missing provider parameter")

  const feature = url.searchParams.get("feature") ?? "login"
  const config = getProviderConfig(provider, env)
  const scopes = config.scopes[feature]
  if (!scopes) return errorResponse(`Unsupported feature: ${feature}`)

  const state = generateState(provider, feature)
  return buildAuthRedirect(config, scopes, state)
}

export async function handleCallback(request: Request, env: Env): Promise<Response> {
  const result = await exchangeCallback(request, env)
  if (result instanceof Response) return result

  const { state, tokenResponse } = result

  if (state.feature !== "login") {
    const appRedirectUrl = new URL("/auth/feature/callback", env.GOOGLE_CALLBACK_URL)
    appRedirectUrl.searchParams.set("access_token", tokenResponse.access_token)
    appRedirectUrl.searchParams.set("refresh_token", tokenResponse.refresh_token || "")
    appRedirectUrl.searchParams.set("expires_in", String(tokenResponse.expires_in))
    appRedirectUrl.searchParams.set("provider", state.provider)
    appRedirectUrl.searchParams.set("feature", state.feature)

    return new Response(null, {
      status: 302,
      headers: { Location: appRedirectUrl.toString() },
    })
  }

  if (!tokenResponse.refresh_token) {
    return errorResponse("No refresh token received. Re-authorize with prompt=consent.", 500)
  }

  const appRedirectUrl = new URL("/", env.GOOGLE_CALLBACK_URL)
  const cookieValue = `${state.provider}:${tokenResponse.refresh_token}`
  const maxAge = 60 * 60 * 24 * 365 // 1 year

  return new Response(null, {
    status: 302,
    headers: {
      Location: appRedirectUrl.toString(),
      "Set-Cookie": setCookieHeader(REFRESH_COOKIE, cookieValue, maxAge),
    },
  })
}

export async function handleRefresh(request: Request, env: Env): Promise<Response> {
  let provider: string | undefined
  let refreshToken: string | undefined

  const contentType = request.headers.get("Content-Type")
  if (contentType?.includes("application/json")) {
    const body = (await request.json()) as { provider?: string; refresh_token?: string }
    provider = body.provider
    refreshToken = body.refresh_token
  }

  if (!provider || !refreshToken) {
    const cookie = getCookie(request, REFRESH_COOKIE)
    if (!cookie) return errorResponse("No refresh token found", 401)

    const separatorIndex = cookie.indexOf(":")
    if (separatorIndex === -1) return errorResponse("Invalid refresh cookie", 401)

    provider = cookie.substring(0, separatorIndex)
    refreshToken = cookie.substring(separatorIndex + 1)
  }

  const config = getProviderConfig(provider, env)
  const tokenResponse = await refreshAccessToken(refreshToken, config)

  return jsonResponse({
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token || refreshToken,
    expires_in: tokenResponse.expires_in,
    provider,
  })
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const cookie = getCookie(request, REFRESH_COOKIE)
  if (cookie) {
    const separatorIndex = cookie.indexOf(":")
    if (separatorIndex !== -1) {
      const provider = cookie.substring(0, separatorIndex)
      const refreshToken = cookie.substring(separatorIndex + 1)
      const config = getProviderConfig(provider, env)
      await fetch(`${config.revokeUrl}?token=${refreshToken}`, { method: "POST" })
    }
  }

  return jsonResponse({ ok: true }, 200, {
    "Set-Cookie": clearCookieHeader(REFRESH_COOKIE),
  })
}

export async function handleFeatureRevoke(request: Request, env: Env): Promise<Response> {
  const { provider, token } = (await request.json()) as { provider: string; token: string }
  if (!provider || !token) return errorResponse("Missing provider or token")

  const config = getProviderConfig(provider, env)

  await fetch(`${config.revokeUrl}?token=${token}`, { method: "POST" })

  return jsonResponse({ ok: true })
}

// --- Shared helpers ---

function buildAuthRedirect(config: OAuthProviderConfig, scopes: string[], state: string): Response {
  const authUrl = new URL(config.authUrl)
  authUrl.searchParams.set("client_id", config.clientId)
  authUrl.searchParams.set("redirect_uri", config.callbackUrl)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", scopes.join(" "))
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("access_type", "offline")
  authUrl.searchParams.set("prompt", "consent")
  return Response.redirect(authUrl.toString(), 302)
}

async function exchangeCallback(request: Request, env: Env): Promise<{ state: ReturnType<typeof parseState>; tokenResponse: OAuthTokenResponse } | Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const stateParam = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) return errorResponse(`OAuth error: ${error}`)
  if (!code || !stateParam) return errorResponse("Missing code or state")

  const state = parseState(stateParam)
  const config = getProviderConfig(state.provider, env)
  const tokenResponse = await exchangeCode(code, config)

  return { state, tokenResponse }
}

async function exchangeCode(code: string, config: { tokenUrl: string; clientId: string; clientSecret: string; callbackUrl: string }): Promise<OAuthTokenResponse> {
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return (await response.json()) as OAuthTokenResponse
}

async function refreshAccessToken(refreshToken: string, config: { tokenUrl: string; clientId: string; clientSecret: string }): Promise<OAuthTokenResponse> {
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return (await response.json()) as OAuthTokenResponse
}
