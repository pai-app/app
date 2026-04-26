import { StrataProvider, TenantProvider } from "strata-plugins-ui/react"
import { strataConfig } from "@/lib/strata-config"
import { ThemeProvider } from "@/providers/theme-provider"
import { AppRouter } from "./router"

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <StrataProvider config={strataConfig}>
        <TenantProvider>
          <div className="grainy min-h-screen bg-[radial-gradient(ellipse_at_top_left,oklch(0.96_0.025_260),var(--background)_60%)] dark:bg-linear-to-br dark:from-background dark:to-muted/40">
            <AppRouter />
          </div>
        </TenantProvider>
      </StrataProvider>
    </ThemeProvider>
  )
}