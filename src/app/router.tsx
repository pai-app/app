import { BrowserRouter, Routes, Route, Outlet, useParams, useNavigate } from "react-router"
import { useEffect, useRef } from "react"
import { useStatus, useTenant, useFyreDbApp } from "@fyre-db/plugins-ui"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { UnlockDialog } from "@/features/auth/unlock-dialog"
import { DefaultTemplate } from "@/templates/default-template"
import { HomePage } from "@/features/home/home-page"
import { TenantsPage } from "@/features/tenants/tenants-page"
import { LoginPage } from "@/features/auth/login-page"
import { AuthCallbackPage } from "@/features/auth/auth-callback-page"
import { LandingPage } from "@/marketing/landing-page"
import { SettingsPage } from "@/features/settings/settings-page"
import { TransactionsPage } from "@/features/transactions/transactions-page"
import { GeneralSection } from "@/features/settings/sections/general-section"
import { AccountsSection } from "@/features/settings/sections/accounts-section"
import { ImportsSection } from "@/features/settings/sections/imports-section"
import { RulesSection } from "@/features/settings/sections/rules-section"
import { DevHubPage } from "@/features/dev/dev-hub-page"
import { LoggingSection } from "@/features/dev/sections/logging-section"
import { ComponentsSection } from "@/features/dev/sections/components-section"
import { DataSection } from "@/features/dev/sections/data-section"

function AuthGuardRoute() {
  const status = useStatus()
  const navigate = useNavigate()
  useEffect(() => {
    if (status === "signed-out") {
      void navigate("/login", { replace: true })
    }
  }, [status, navigate])
  if (status === "connecting" || status === "signed-out") {
    return <FullPageSpinner message="Signing in…" />
  }
  return <Outlet />
}

function TenantGuardRoute() {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const status = useStatus()
  const { active } = useTenant()
  const app = useFyreDbApp()
  const requestedRef = useRef<string | null>(null)

  // Open the URL's tenant once per id. We must NOT depend on `active?.id`:
  // `openTenant` closes the current tenant first (active → undefined mid-open),
  // which would otherwise re-fire this effect and loop close→open forever.
  useEffect(() => {
    if (!tenantId) {
      void navigate("/tenants", { replace: true })
      return
    }
    if (requestedRef.current !== tenantId) {
      requestedRef.current = tenantId
      void app.openTenant(tenantId)
    }
  }, [tenantId, app, navigate])

  useEffect(() => {
    if (status === "error") {
      void navigate("/tenants", { replace: true })
    }
  }, [status, navigate])

  if (status === "unlocking") return <UnlockDialog />
  if (active?.id === tenantId && status === "ready") return <Outlet />
  return <FullPageSpinner message="Opening household…" />
}

function DefaultLayoutRoute() {
  return (
    <DefaultTemplate>
      <Outlet />
    </DefaultTemplate>
  )
}

/**
 * Public marketing root. Signed-in visitors are bounced into the app
 * (`/tenants`) — including after a login redirect, which lands on `/` — so the
 * landing page only ever shows to signed-out users.
 */
function RootRoute() {
  const status = useStatus()
  const navigate = useNavigate()
  const signedIn = status !== "connecting" && status !== "signed-out"

  useEffect(() => {
    if (signedIn) {
      void navigate("/tenants", { replace: true })
    }
  }, [signedIn, navigate])

  if (status === "connecting") return <FullPageSpinner message="Signing in…" />
  if (signedIn) return <FullPageSpinner message="Opening Pai…" />
  return <LandingPage />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
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
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="settings" element={<SettingsPage />}>
                <Route path="general" element={<GeneralSection />} />
                <Route path="accounts" element={<AccountsSection />} />
                <Route path="imports" element={<ImportsSection />} />
                <Route path="rules" element={<RulesSection />} />
              </Route>
              <Route path="dev" element={<DevHubPage />}>
                <Route path="logging" element={<LoggingSection />} />
                <Route path="components" element={<ComponentsSection />} />
                <Route path="data" element={<DataSection />} />
                <Route path="data/:entityName" element={<DataSection />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}