import { useRef } from "react"
import { FyreDbAppProvider } from "@fyre-db/plugins-ui"
import { fyreDbApp } from "@/providers/fyredb-config"
import { AppProvider } from "@/providers/app-provider"
import { ServicesProvider } from "@/providers/services-provider"
import { ImportProvider } from "@/providers/import-provider"
import { NotificationProvider } from "@/providers/notification-provider"
import { BreadcrumbProvider } from "@/providers/breadcrumb-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import { Toaster } from "@/providers/sonner"
import { AppRouter } from "./router"

export function App() {
  const scrollElementRef = useRef<HTMLDivElement | null>(null)

  return (
    <ThemeProvider defaultTheme="system">
      <div className="h-full grainy bg-[radial-gradient(ellipse_at_top_left,oklch(0.96_0.025_260),var(--background)_60%)] dark:bg-linear-to-br dark:from-background dark:to-muted/40">
        <div ref={scrollElementRef} className="overflow-auto h-full">
          <FyreDbAppProvider app={fyreDbApp} tenantLabel="household">
            <AppProvider scrollElementRef={scrollElementRef}>
              <ServicesProvider>
                <ImportProvider>
                  <NotificationProvider>
                    <BreadcrumbProvider>
                      <AppRouter />
                    </BreadcrumbProvider>
                  </NotificationProvider>
                </ImportProvider>
              </ServicesProvider>
            </AppProvider>
          </FyreDbAppProvider>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  )
}