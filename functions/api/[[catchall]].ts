import {
  ServerAuthService,
  BffServerAdapter,
  GOOGLE_OAUTH_ENDPOINTS,
  GOOGLE_DRIVE_SCOPES,
} from "strata-adapters"
import { GOOGLE_AUTH_NAME, AUTH_BASE_PREFIX } from "../../shared/providers"

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const auth = new ServerAuthService(
    [
      {
        adapter: new BffServerAdapter({
          name: GOOGLE_AUTH_NAME,
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackUrl: env.GOOGLE_CALLBACK_URL,
          endpoints: GOOGLE_OAUTH_ENDPOINTS,
          scopes: { login: [...GOOGLE_DRIVE_SCOPES] },
        }),
        refreshCookieName: `auth_${GOOGLE_AUTH_NAME}_refresh`,
        csrfCookieName: `auth_${GOOGLE_AUTH_NAME}_csrf`,
        loginRedirectPath: '/',
        errorRedirectPath: '/login?error=auth_failed',
      },
    ],
    { basePath: AUTH_BASE_PREFIX },
  )
  return auth.fetch(request)
}