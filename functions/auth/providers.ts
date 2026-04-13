export type OAuthProviderConfig = {
  readonly authUrl: string
  readonly tokenUrl: string
  readonly revokeUrl: string
  readonly clientId: string
  readonly clientSecret: string
  readonly callbackUrl: string
  readonly scopes: {
    readonly login: readonly string[]
    readonly [feature: string]: readonly string[]
  }
}

export type OAuthTokenResponse = {
  readonly access_token: string
  readonly refresh_token?: string
  readonly expires_in: number
  readonly token_type: string
  readonly scope?: string
}

export function getProviderConfig(provider: string, env: Env): OAuthProviderConfig {
  switch (provider) {
    case "google":
      return {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        revokeUrl: "https://oauth2.googleapis.com/revoke",
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackUrl: env.GOOGLE_CALLBACK_URL,
        scopes: {
          login: [
            'openid', 'email', 'profile',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.appdata',
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
          ],
          "email-import": [
            "https://www.googleapis.com/auth/gmail.readonly",
          ],
        },
      }
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}
