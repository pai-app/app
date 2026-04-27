import { useEffect } from "react"
import { useNavigate } from "react-router"
import { LoginButtons } from "strata-plugins-ui"
import { useAuth } from "strata-plugins-ui/react"
import { LobbyTemplate } from "@/templates/lobby-template"
import { useTheme } from "@/providers/theme-provider"

export function LoginPage() {
  const navigate = useNavigate()
  const { status, name } = useAuth()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (status === "signed-in" && name) {
      navigate("/tenants", { replace: true })
    }
  }, [status, name, navigate])

  return (
    <LobbyTemplate>
      <LoginButtons mode={resolvedTheme} variant="pill" />
    </LobbyTemplate>
  )
}