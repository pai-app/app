import {
  createOAuthService,
  GoogleDriveAdapter,
  defineStrata,
  type AuthAdapter,
  type ProviderRegistration,
  type CloudFactory,
} from "strata-adapters"
import { GOOGLE_PROVIDER_NAME } from "@shared/google-oauth"
import { PROVIDERS } from "@shared/providers"
import { DEVICE_ID_KEY, FEATURE_CREDS_KEY, RETURN_URL_KEY, SESSION_KEY } from "@shared/storage-keys"
import { featureAccountDef } from "@/services/entities/feature-account"

function tokenGetter(auth: AuthAdapter) {
  return async () => {
    const token = await auth.getAccessToken()
    if (!token) throw new Error("No access token available")
    return token
  }
}

/**
 * Per-provider client wiring. Keys must match `name` in `shared/providers.ts`.
 * Adding a new provider:
 *   1. add an entry to `shared/providers.ts`
 *   2. add a cloud factory below (if the provider has cloud storage)
 */
const cloudFactories: Readonly<Record<string, CloudFactory>> = {
  [GOOGLE_PROVIDER_NAME]: (auth) => new GoogleDriveAdapter(tokenGetter(auth)),
}

function buildProviders(): {
  readonly authServices: Readonly<Record<string, ReturnType<typeof createOAuthService>>>
  readonly providers: Readonly<Record<string, ProviderRegistration>>
} {
  const authServices: Record<string, ReturnType<typeof createOAuthService>> = {}
  const providers: Record<string, ProviderRegistration> = {}
  for (const entry of PROVIDERS) {
    const name = entry.public.name
    const auth = createOAuthService({
      providerName: name,
      sessionKey: SESSION_KEY,
      returnUrlKey: RETURN_URL_KEY,
      featureCredsKey: FEATURE_CREDS_KEY,
    })
    auth.tryRestoreSession()
    authServices[name] = auth
    providers[name] = { auth: () => auth, cloud: cloudFactories[name] }
  }
  return { authServices, providers }
}

const built = buildProviders()

/** Singleton AuthService for Google. Pages can import this for feature auth (saveFeatureCreds, etc). */
export const googleAuthService = built.authServices[GOOGLE_PROVIDER_NAME]

export const strataConfig = defineStrata({
  appId: "fin",
  deviceIdKey: DEVICE_ID_KEY,
  entities: [featureAccountDef],
  providers: built.providers,
})

