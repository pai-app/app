import { defineOAuthHandlers } from "strata-adapters"
import { PROVIDERS } from "../../shared/providers"

export const onRequest: PagesFunction<Env> = defineOAuthHandlers<Env>("fin")
  .providers(PROVIDERS)
  .build()

