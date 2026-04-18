import { BrowserRouter, Routes, Route, Navigate } from "react-router"
import { AuthGuard, TenantGuard } from "strata-plugins-ui/react"
import { strataConfig } from "@/lib/strata-config"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { LoginPage } from "@/pages/login/login-page"
import { HomePage } from "@/pages/home/home-page"
import { TenantsPage } from "@/pages/tenants/tenants-page"
import { FeatureCallbackPage } from "@/pages/auth/feature-callback-page"

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/feature/callback" element={<FeatureCallbackPage />} />
        <Route
          element={
            <AuthGuard
              redirect="/login"
              loading={<FullPageSpinner message="Signing in…" />}
              returnUrlKey={strataConfig.storageKeys.returnUrl}
            />
          }
        >
          <Route path="/tenants" element={<TenantsPage />} />
          <Route
            path="/t/:tenantId"
            element={
              <TenantGuard
                paramId="tenantId"
                redirect="/tenants"
                loading={<FullPageSpinner message="Opening workspace…" />}
              />
            }
          >
            <Route index element={<HomePage />} />
          </Route>
          <Route index element={<Navigate to="/tenants" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
