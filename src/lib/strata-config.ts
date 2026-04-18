import { defineStrata } from "strata-adapters"
import { PROVIDERS } from "@shared/providers"
import { featureAccountDef } from "@/services/entities/feature-account"

export const strataConfig = defineStrata("fin")
  .entities([featureAccountDef])
  .auth.bff(PROVIDERS)
  .storage.fromProvider()
  .build()

