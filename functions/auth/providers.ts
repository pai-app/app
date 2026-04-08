export interface OAuthProviderConfig {
  authUrl: string
  tokenUrl: string
  revokeUrl: string
  clientId: string
  clientSecret: string
  callbackUrl: string
  scopes: {
    login: string[]
    [feature: string]: string[]
  }
}

export interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
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
            "https://www.googleapis.com/auth/drive.file",
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
