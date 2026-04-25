import { useEffect } from "react"
import { useNavigate } from "react-router"
import { LoginButtons } from "strata-plugins-ui"
import { useAuth } from "strata-plugins-ui/react"
import { AuthTemplate } from "@/templates/auth-template"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { useTheme } from "@/providers/theme-provider"

export function LoginPage() {
  const navigate = useNavigate()
  const { status, name } = useAuth()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (status === "signed-in" && name) {
      navigate("/tenants")
    }
  }, [status, name, navigate])

  return (
    <AuthTemplate>
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <LoginButtons mode={resolvedTheme} variant="pill" />
    </AuthTemplate>
  )
}