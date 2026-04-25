import {
  BffClientAdapter,
  ClientAuthService,
  CloudService,
} from "strata-adapters"
import { GoogleDriveProvider } from "strata-plugins-ui/google"
import { createStrataConfig } from "strata-plugins-ui/react"
import { CloudProviderService } from "strata-plugins-ui"
import {
  GOOGLE_AUTH_NAME,
  AUTH_BASE_PREFIX,
} from "@shared/providers"
import { ENTITIES } from "@/services/entities"

export { ENTITIES } from "@/services/entities"

export const APP_ID = "fin"
export const RETURN_URL_KEY = `${APP_ID}_return_url`

export const clientAuth = new ClientAuthService(
  [
    new BffClientAdapter({
      name: GOOGLE_AUTH_NAME,
      prefix: AUTH_BASE_PREFIX,
    }),
  ],
  { activeAuthKey: `${APP_ID}_active_auth` },
)

export const googleProvider = new GoogleDriveProvider({
  getAccessToken: () => clientAuth.getAccessToken(),
})

export const cloud = new CloudService([googleProvider], clientAuth)
export const providers = new CloudProviderService([googleProvider], cloud)

export const strataConfig = createStrataConfig({
  appId: APP_ID,
  entities: ENTITIES,
  cloud,
  providers,
  auth: clientAuth,
})