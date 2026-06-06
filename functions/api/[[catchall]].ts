import {
  ServerAuthService,
  BffServerAdapter,
  GOOGLE_OAUTH_ENDPOINTS,
  GOOGLE_DRIVE_SCOPES,
  MICROSOFT_OAUTH_ENDPOINTS,
  ONEDRIVE_SCOPES,
} from "@strata/plugins"
import { GOOGLE_AUTH_NAME, MICROSOFT_AUTH_NAME, AUTH_BASE_PREFIX, REFRESH_COOKIE, CSRF_COOKIE, GOOGLE_EMAIL_SCOPES, MICROSOFT_EMAIL_SCOPES } from "../../shared/providers"
import debug from "debug"

let cachedAuth: ServerAuthService | null = null

function getAuthService(env: Env): ServerAuthService {
  if (!cachedAuth) {
    cachedAuth = new ServerAuthService(
      [
        new BffServerAdapter({
          name: GOOGLE_AUTH_NAME,
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackUrl: env.GOOGLE_CALLBACK_URL,
          endpoints: GOOGLE_OAUTH_ENDPOINTS,
          scopes: {
            login: [...GOOGLE_DRIVE_SCOPES],
            email: [...GOOGLE_EMAIL_SCOPES],
          },
        }),
        new BffServerAdapter({
          name: MICROSOFT_AUTH_NAME,
          clientId: env.MICROSOFT_CLIENT_ID,
          clientSecret: env.MICROSOFT_CLIENT_SECRET,
          callbackUrl: env.MICROSOFT_CALLBACK_URL,
          endpoints: MICROSOFT_OAUTH_ENDPOINTS,
          scopes: {
            login: [...ONEDRIVE_SCOPES],
            email: [...MICROSOFT_EMAIL_SCOPES],
          },
        }),
      ],
      {
        basePath: AUTH_BASE_PREFIX,
        refreshCookieName: REFRESH_COOKIE,
        csrfCookieName: CSRF_COOKIE,
        loginRedirectPath: '/',
        featureRedirectPath: '/auth/callback',
        errorRedirectPath: '/login?error=auth_failed',
      },
    )
  }
  return cachedAuth
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (env.DEBUG) debug.enable(env.DEBUG)
  return getAuthService(env).fetch(request)
}