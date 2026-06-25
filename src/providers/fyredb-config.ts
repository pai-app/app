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
  DEVICE_ID_KEY,
} from "@shared/providers"
import { ENTITIES } from "@/entities"
import { sessionSlot, xorTransform, getOrCreateDeviceId } from "@/providers/web-storage"

export { ENTITIES } from "@/entities"

export const APP_ID = "pai"

export const deviceId = getOrCreateDeviceId(DEVICE_ID_KEY)

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
  {
    returnUrl: sessionSlot(RETURN_URL_KEY),
    featureCreds: sessionSlot(FEATURE_CREDS_KEY),
  },
)

export const googleProvider = new GoogleDriveProvider({
  getAccessToken: () => clientAuth.getAccessToken(),
})

export const onedriveProvider = new OneDriveProvider({
  getAccessToken: () => clientAuth.getAccessToken(),
})

export const fyreDbApp = new FyreDbApp({
  appId: APP_ID,
  deviceId,
  entities: ENTITIES,
  auth: clientAuth,
  providers: [googleProvider, onedriveProvider],
  credential: sessionSlot(SESSION_KEY, xorTransform(deviceId)),
})

export const providers = new CloudProviderService(
  [googleProvider, onedriveProvider],
  fyreDbApp.provider$,
)