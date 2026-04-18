import {
  GoogleDriveAdapter,
  defineStrata,
  type AuthAdapter,
  type ProviderModule,
} from "strata-adapters"
import { GOOGLE_PROVIDER_NAME } from "@shared/google-oauth"
import { PROVIDERS } from "@shared/providers"
import {
  DEVICE_ID_KEY,
  FEATURE_CREDS_KEY,
  RETURN_URL_KEY,
  SESSION_KEY,
} from "@shared/storage-keys"
import { featureAccountDef } from "@/services/entities/feature-account"

function tokenGetter(auth: AuthAdapter) {
  return async () => {
    const token = await auth.getAccessToken()
    if (!token) throw new Error("No access token available")
    return token
  }
}

/**
 * Per-provider cloud wiring. Keys match `name` in `shared/providers.ts`.
 * Adding a new login provider: add an entry below mapping its name to a
 * `(auth) => StorageAdapter` factory.
 */
const cloudFactories: Readonly<Record<string, ProviderModule["cloud"]>> = {
  [GOOGLE_PROVIDER_NAME]: (auth) => new GoogleDriveAdapter(tokenGetter(auth)),
}

const providerModules: readonly ProviderModule[] = PROVIDERS.map((entry) => ({
  name: entry.public.name,
  label: entry.public.name,
  features: entry.public.features,
  cloud: cloudFactories[entry.public.name],
}))

export const strataConfig = defineStrata({
  appId: "fin",
  storageKeys: {
    deviceId: DEVICE_ID_KEY,
    session: SESSION_KEY,
    returnUrl: RETURN_URL_KEY,
    featureCreds: FEATURE_CREDS_KEY,
  },
  entities: [featureAccountDef],
  providers: providerModules,
})

