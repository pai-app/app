import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useNavigate, useLocation } from "react-router"
import { AuthGuard, TenantGuard } from "strata-plugins-ui/react"
import { RETURN_URL_KEY } from "@shared/providers"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { HomePage } from "@/pages/home/home-page"
import { TenantsPage } from "@/pages/tenants/tenants-page"
import { LoginPage } from "@/pages/login/login-page"
import { AuthCallbackPage } from "@/pages/auth/auth-callback-page"

function AuthGuardRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <AuthGuard
      onUnauthenticated={() => {
        sessionStorage.setItem(RETURN_URL_KEY, location.pathname + location.search)
        navigate("/login", { replace: true })
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
  return (
    <TenantGuard
      tenantId={tenantId}
      onUnauthenticated={() => navigate("/tenants", { replace: true })}
      loading={<FullPageSpinner message="Opening workspace…" />}
    >
      <Outlet />
    </TenantGuard>
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
            <Route index element={<HomePage />} />
          </Route>
          <Route index element={<Navigate to="/tenants" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}