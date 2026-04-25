import { StrataProvider } from "strata-plugins-ui/react"
import { strataConfig } from "@/lib/strata-config"
import { AppRouter } from "./router"

export function App() {
  return (
    <StrataProvider config={strataConfig}>
      <AppRouter />
    </StrataProvider>
  )
}