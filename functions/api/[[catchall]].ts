import { createOAuthHandlers, errorResponse, type OAuthHandlers, type ProviderMap } from "strata-adapters"
import { REFRESH_COOKIE } from "../../shared/storage-keys"
import { PROVIDERS } from "../../shared/providers"

function buildProviders(env: Env): ProviderMap {
  const e = env as unknown as Record<string, string>
  const out: Record<string, ProviderMap[string]> = {}
  for (const entry of PROVIDERS) {
    out[entry.public.name] = {
      ...entry.public,
      clientId: e[entry.envKeys.clientId],
      clientSecret: e[entry.envKeys.clientSecret],
      callbackUrl: e[entry.envKeys.callbackUrl],
    }
  }
  return out
}

function createHandlers(env: Env): OAuthHandlers {
  return createOAuthHandlers({
    cookieName: REFRESH_COOKIE,
    providers: buildProviders(env),
  })
}

type Handler = (request: Request) => Promise<Response>

type Route = {
  readonly method: string
  readonly path: string
  readonly pick: (h: OAuthHandlers) => Handler
}

const routes: readonly Route[] = [
  { method: "GET",  path: "/api/auth/login",             pick: (h) => h.handleLogin },
  { method: "GET",  path: "/api/auth/callback",          pick: (h) => h.handleCallback },
  { method: "POST", path: "/api/auth/refresh",           pick: (h) => h.handleRefresh },
  { method: "POST", path: "/api/auth/logout",            pick: (h) => h.handleLogout },
  { method: "GET",  path: "/api/auth/feature/login",     pick: (h) => h.handleLogin },
  { method: "GET",  path: "/api/auth/feature/callback",  pick: (h) => h.handleCallback },
  { method: "POST", path: "/api/auth/feature/refresh",   pick: (h) => h.handleFeatureRefresh },
  { method: "POST", path: "/api/auth/feature/revoke",    pick: (h) => h.handleFeatureRevoke },
]

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  const route = routes.find((r) => r.method === request.method && r.path === url.pathname)
  if (!route) return errorResponse("Not found", 404)

  try {
    const handler = route.pick(createHandlers(env))
    return await handler(request)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error"
    return errorResponse(message, 500)
  }
}
