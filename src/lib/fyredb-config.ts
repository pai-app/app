import {
  BffClientAdapter,
  ClientAuthService,
  FyreDbApp,
} from "@fyre-db/plugins"
import { GoogleDriveProvider, OneDriveProvider, CloudProviderService } from "@fyre-db/plugins-ui"
import {
  GOOGLE_AUTH_NAME,
  MICROSOFT_AUTH_NAME,
  AUTH_BASE_PREFIX,
  SESSION_KEY,
  RETURN_URL_KEY,
  FEATURE_CREDS_KEY,
} from "@shared/providers"
import { ENTITIES } from "@/services/entities"

export { ENTITIES } from "@/services/entities"

export const APP_ID = "pai"

export const clientAuth = new ClientAuthService(
  [
    new BffClientAdapter({
      name: GOOGLE_AUTH_NAME,
      prefix: AUTH_BASE_PREFIX,
    }),
    new BffClientAdapter({
      name: MICROSOFT_AUTH_NAME,
      prefix: AUTH_BASE_PREFIX,
    }),
  ],
  { returnUrlKey: RETURN_URL_KEY, featureCredsKey: FEATURE_CREDS_KEY },
)

export const googleProvider = new GoogleDriveProvider({
  getAccessToken: () => clientAuth.getAccessToken(),
})

export const onedriveProvider = new OneDriveProvider({
  getAccessToken: () => clientAuth.getAccessToken(),
})

export const fyreDbApp = new FyreDbApp({
  appId: APP_ID,
  entities: ENTITIES,
  auth: clientAuth,
  providers: [googleProvider, onedriveProvider],
  credentialCacheKey: SESSION_KEY,
})

export const providers = new CloudProviderService(
  [googleProvider, onedriveProvider],
  fyreDbApp.provider$,
)