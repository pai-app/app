import { handleLogin, handleCallback, handleRefresh, handleLogout, handleFeatureRevoke } from "../auth/handlers"
import { errorResponse } from "../auth/utils"

type Route = {
  readonly method: string
  readonly path: string
  readonly handler: (request: Request, env: Env) => Promise<Response>
}

const routes: Route[] = [
  { method: "GET", path: "/api/auth/login", handler: handleLogin },
  { method: "GET", path: "/api/auth/callback", handler: handleCallback },
  { method: "POST", path: "/api/auth/refresh", handler: handleRefresh },
  { method: "POST", path: "/api/auth/logout", handler: handleLogout },
  { method: "GET", path: "/api/auth/feature/login", handler: handleLogin },
  { method: "GET", path: "/api/auth/feature/callback", handler: handleCallback },
  { method: "POST", path: "/api/auth/feature/refresh", handler: handleRefresh },
  { method: "POST", path: "/api/auth/feature/revoke", handler: handleFeatureRevoke },
]

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  const route = routes.find(r => r.method === request.method && r.path === url.pathname)
  if (route) {
    try {
      return await route.handler(request, env)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Internal server error"
      return errorResponse(message, 500)
    }
  }

  return errorResponse("Not found", 404)
}
