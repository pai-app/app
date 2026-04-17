import { initAuth, errorResponse } from "strata-adapters"
import { createAuthConfig } from "../../src/lib/auth-config"

function createHandlers(env: Env) {
  const { handlers } = initAuth(createAuthConfig(env))
  return handlers!
}

type Route = {
  readonly method: string
  readonly path: string
  readonly handler: keyof NonNullable<ReturnType<typeof initAuth>['handlers']>
}

const routes: Route[] = [
  { method: "GET", path: "/api/auth/login", handler: "handleLogin" },
  { method: "GET", path: "/api/auth/callback", handler: "handleCallback" },
  { method: "POST", path: "/api/auth/refresh", handler: "handleRefresh" },
  { method: "POST", path: "/api/auth/logout", handler: "handleLogout" },
  { method: "GET", path: "/api/auth/feature/login", handler: "handleLogin" },
  { method: "GET", path: "/api/auth/feature/callback", handler: "handleCallback" },
  { method: "POST", path: "/api/auth/feature/refresh", handler: "handleFeatureRefresh" },
  { method: "POST", path: "/api/auth/feature/revoke", handler: "handleFeatureRevoke" },
]

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  const route = routes.find(r => r.method === request.method && r.path === url.pathname)
  if (route) {
    const handlers = createHandlers(env)
    try {
      return await handlers[route.handler](request)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Internal server error"
      return errorResponse(message, 500)
    }
  }

  return errorResponse("Not found", 404)
}
