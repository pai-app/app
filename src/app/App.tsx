import { StrataProvider } from "strata-adapters/react"
import { strataConfig } from "@/lib/strata-config"
import { AppRouter } from "./router"

export function App() {
  return (
    <StrataProvider config={strataConfig}>
      <AppRouter />
    </StrataProvider>
  )
}
