import { BrowserRouter, Routes, Route, Outlet, useParams, useNavigate } from "react-router"
import { AuthGuard, TenantGuard } from "@strata/plugins-ui"
import { useTheme } from "@/providers/theme-provider"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { DefaultTemplate } from "@/templates/default-template"
import { HomePage } from "@/pages/home/home-page"
import { TenantsPage } from "@/pages/tenants/tenants-page"
import { LoginPage } from "@/pages/login/login-page"
import { AuthCallbackPage } from "@/pages/auth/auth-callback-page"
import { LandingPage } from "@/pages/landing/landing-page"
import { SettingsPage } from "@/pages/settings/settings-page"
import { GeneralSection } from "@/pages/settings/sections/general-section"
import { AccountsSection } from "@/pages/settings/sections/accounts-section"
import { ImportsSection } from "@/pages/settings/sections/imports-section"
import { DevHubPage } from "@/pages/dev/dev-hub-page"
import { LoggingSection } from "@/pages/dev/sections/logging-section"
import { ComponentsSection } from "@/pages/dev/sections/components-section"
import { DataSection } from "@/pages/dev/sections/data-section"

function AuthGuardRoute() {
  const navigate = useNavigate()
  return (
    <AuthGuard
      onUnauthenticated={() => {
        void navigate("/login", { replace: true })
      }}
      loading={<FullPageSpinner message="Signing in…" />}
    >
      <Outlet />
    </AuthGuard>
  )
}

function TenantGuardRoute() {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  return (
    <TenantGuard
      tenantId={tenantId}
      onUnauthenticated={() => void navigate("/tenants", { replace: true })}
      mode={resolvedTheme}
      loading={<FullPageSpinner message="Opening household…" />}
    >
      <Outlet />
    </TenantGuard>
  )
}

function DefaultLayoutRoute() {
  return (
    <DefaultTemplate>
      <Outlet />
    </DefaultTemplate>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/dev" element={<DevHubPage />}>
          <Route path="logging" element={<LoggingSection />} />
          <Route path="components" element={<ComponentsSection />} />
        </Route>
        <Route element={<AuthGuardRoute />}>
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/t/:tenantId" element={<TenantGuardRoute />}>
            <Route element={<DefaultLayoutRoute />}>
              <Route index element={<HomePage />} />
              <Route path="settings" element={<SettingsPage />}>
                <Route path="general" element={<GeneralSection />} />
                <Route path="accounts" element={<AccountsSection />} />
                <Route path="imports" element={<ImportsSection />} />
              </Route>
              <Route path="dev" element={<DevHubPage />}>
                <Route path="logging" element={<LoggingSection />} />
                <Route path="components" element={<ComponentsSection />} />
                <Route path="data" element={<DataSection />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}