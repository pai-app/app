import { BrowserRouter, Routes, Route } from "react-router"
import { AppLoader } from "@/app/AppLoader"
import { LoginPage } from "@/pages/login/LoginPage"
import { HomePage } from "@/pages/home/HomePage"
import { FeatureCallbackPage } from "@/pages/auth/FeatureCallbackPage"

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/feature/callback" element={<FeatureCallbackPage />} />
        <Route element={<AppLoader />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
