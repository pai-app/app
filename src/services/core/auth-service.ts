import { initAuth } from "strata-adapters"
import { createAuthConfig } from "@/lib/auth-config"

const auth = initAuth(createAuthConfig({
  GOOGLE_CLIENT_ID: '',
}))

export const authService = auth.service
export const authProviders = auth.providers
