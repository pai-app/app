import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from "react-router"
import { RequireAuth, TenantProvider, useTenant } from "strata-adapters/react"
import { authService } from "@/services/core/auth-service"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { LoginPage } from "@/pages/login/login-page"
import { HomePage } from "@/pages/home/home-page"
import { TenantsPage } from "@/pages/tenants/tenants-page"
import { FeatureCallbackPage } from "@/pages/auth/feature-callback-page"

function AuthGuard() {
  return (
    <RequireAuth
      loading={<FullPageSpinner message="Signing in…" />}
      unauthenticated={<RedirectToLogin />}
    >
      <Outlet />
    </RequireAuth>
  )
}

function RedirectToLogin() {
  authService.saveReturnUrl()
  return <Navigate to="/login" replace />
}

function TenantGuard() {
  const { tenantId } = useParams()
  return (
    <TenantProvider tenantId={tenantId}>
      <TenantGate />
    </TenantProvider>
  )
}

function TenantGate() {
  const { tenant, loading, error } = useTenant()

  if (loading || (!tenant && !error)) return <FullPageSpinner message="Opening workspace…" />
  if (!tenant) return <Navigate to="/tenants" replace />

  return <Outlet />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/feature/callback" element={<FeatureCallbackPage />} />
        <Route element={<AuthGuard />}>
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/t/:tenantId" element={<TenantGuard />}>
            <Route index element={<HomePage />} />
          </Route>
          <Route index element={<Navigate to="/tenants" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
