import type { AuthInitConfig } from "strata-adapters"

const GOOGLE = {
  name: 'google',
  label: 'Continue with Google',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  revokeUrl: 'https://oauth2.googleapis.com/revoke',
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
} as const

type AuthEnv = {
  readonly GOOGLE_CLIENT_ID: string
  readonly GOOGLE_CLIENT_SECRET?: string
  readonly GOOGLE_CALLBACK_URL?: string
}

export function createAuthConfig(env: AuthEnv): AuthInitConfig {
  return {
    providers: [
      {
        ...GOOGLE,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackUrl: env.GOOGLE_CALLBACK_URL,
      },
    ],
    storage: {
      sessionKey: 'fin_auth_session',
      returnUrlKey: 'fin_return_url',
      cookieName: 'fin_refresh',
      featureCredsKey: 'fin_feature_creds',
    },
  }
}
