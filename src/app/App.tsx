import { useRef } from "react"
import { StrataProvider, TenantProvider } from "@strata/plugins-ui"
import { strataConfig } from "@/lib/strata-config"
import { AppProvider } from "@/providers/app-provider"
import { EntityProvider } from "@/providers/entity-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import { AppRouter } from "./router"

export function App() {
  const scrollElementRef = useRef<HTMLDivElement | null>(null)

  return (
    <ThemeProvider defaultTheme="system">
      <div className="h-full grainy bg-[radial-gradient(ellipse_at_top_left,oklch(0.96_0.025_260),var(--background)_60%)] dark:bg-linear-to-br dark:from-background dark:to-muted/40">
        <div ref={scrollElementRef} className="overflow-auto h-full">
          <StrataProvider config={strataConfig}>
            <TenantProvider>
              <AppProvider scrollElementRef={scrollElementRef}>
                <EntityProvider>
                  <AppRouter />
                </EntityProvider>
              </AppProvider>
            </TenantProvider>
          </StrataProvider>
        </div>
      </div>
    </ThemeProvider>
  )
}