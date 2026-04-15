import { AuthService } from "strata-adapters"
import { SESSION_KEY, FEATURE_CREDS_KEY, RETURN_URL_KEY } from "@/lib/storage-keys"

export const authService = new AuthService({
  sessionKey: SESSION_KEY,
  returnUrlKey: RETURN_URL_KEY,
  featureCredsKey: FEATURE_CREDS_KEY,
})
