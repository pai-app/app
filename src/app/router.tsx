import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from "react-router"
import { AuthGuard, TenantGuard, TenantProvider } from "strata-plugins-ui/react"
import { RETURN_URL_KEY } from "@/lib/strata-config"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { LoginPage } from "@/pages/login/login-page"
import { HomePage } from "@/pages/home/home-page"
import { TenantsPage } from "@/pages/tenants/tenants-page"

function TenantRoute() {
  const { tenantId } = useParams()
  return (
    <TenantProvider tenantId={tenantId}>
      <Outlet />
    </TenantProvider>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <AuthGuard
              redirect="/login"
              loading={<FullPageSpinner message="Signing in…" />}
              returnUrlKey={RETURN_URL_KEY}
            />
          }
        >
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/t/:tenantId" element={<TenantRoute />}>
            <Route
              element={
                <TenantGuard
                  redirect="/tenants"
                  loading={<FullPageSpinner message="Opening workspace…" />}
                />
              }
            >
              <Route index element={<HomePage />} />
            </Route>
          </Route>
          <Route index element={<Navigate to="/tenants" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}