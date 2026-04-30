import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useNavigate } from "react-router"
import { AuthGuard, TenantGuard } from "strata-plugins-ui/react"
import { useTheme } from "@/providers/theme-provider"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { DefaultTemplate } from "@/templates/default-template"
import { HomePage } from "@/pages/home/home-page"
import { TenantsPage } from "@/pages/tenants/tenants-page"
import { LoginPage } from "@/pages/login/login-page"
import { AuthCallbackPage } from "@/pages/auth/auth-callback-page"

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<AuthGuardRoute />}>
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/t/:tenantId" element={<TenantGuardRoute />}>
            <Route element={<DefaultLayoutRoute />}>
              <Route index element={<HomePage />} />
            </Route>
          </Route>
          <Route index element={<Navigate to="/tenants" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}