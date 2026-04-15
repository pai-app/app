import { createOAuthHandlers, createGoogleProvider, errorResponse } from "strata-adapters"
import { REFRESH_COOKIE } from "../../src/lib/storage-keys"

function createHandlers(env: Env) {
  const provider = createGoogleProvider({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_CALLBACK_URL,
    scopes: {
      login: [
        'openid', 'email', 'profile',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      'email-import': [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    },
  })

  return createOAuthHandlers({ cookieName: REFRESH_COOKIE, provider })
}

type Route = {
  readonly method: string
  readonly path: string
  readonly handler: keyof ReturnType<typeof createHandlers>
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
