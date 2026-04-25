import { StrataProvider, TenantProvider } from "strata-plugins-ui/react"
import { strataConfig } from "@/lib/strata-config"
import { ThemeProvider } from "@/providers/theme-provider"
import { AppRouter } from "./router"

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <StrataProvider config={strataConfig}>
        <TenantProvider>
          <AppRouter />
        </TenantProvider>
      </StrataProvider>
    </ThemeProvider>
  )
}