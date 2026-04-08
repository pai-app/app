import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "@/providers/AuthProvider"
import { AuthService } from "@/services/core/AuthService"

export function AppLoader() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === "loading") return null
  if (auth.status === "unauthenticated") {
    AuthService.saveReturnUrl()
    return <Navigate to="/login" replace />
  }

  // After login redirect lands on /, restore the original URL
  if (location.pathname === "/") {
    const returnUrl = AuthService.consumeReturnUrl()
    if (returnUrl !== "/") {
      return <Navigate to={returnUrl} replace />
    }
  }

  return <Outlet />
}
