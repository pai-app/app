import {
  BffClientAdapter,
  ClientAuthService,
  CloudService,
} from "@fyre-db/plugins"
import { GoogleDriveProvider, OneDriveProvider, createFyreDbConfig, CloudProviderService } from "@fyre-db/plugins-ui"
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

export const APP_ID = "fin"

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

export const cloud = new CloudService([googleProvider, onedriveProvider], clientAuth)
export const providers = new CloudProviderService([googleProvider, onedriveProvider], cloud)

export const fyredbConfig = createFyreDbConfig({
  appId: APP_ID,
  entities: ENTITIES,
  cloud,
  providers,
  auth: clientAuth,
  credentialCacheKey: SESSION_KEY,
  tenantLabel: 'household',
})