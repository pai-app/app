import { StrataProvider } from "strata-adapters/react"
import { authService } from "@/services/core/auth-service"
import { featureAccountDef } from "@/services/entities/feature-account"
import { AppRouter } from "./router"

authService.tryRestoreSession()
const authAdapter = authService.toAuthAdapter()

export function App() {
  return (
    <StrataProvider
      auth={authAdapter}
      appId="fin"
      entities={[featureAccountDef]}
      cloudProvider="google-drive"
    >
      <AppRouter />
    </StrataProvider>
  )
}
