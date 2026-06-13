import { useEffect } from "react"
import { useNavigate } from "react-router"
import { LoginButtons, useAuth } from "@fyre-db/plugins-ui"
import { LobbyTemplate } from "@/templates/lobby-template"
import { useTheme } from "@/providers/theme-provider"

export function LoginPage() {
  const navigate = useNavigate()
  const { status, name } = useAuth()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (status === "signed-in" && name) {
      void navigate("/tenants", { replace: true })
    }
  }, [status, name, navigate])

  return (
    <LobbyTemplate>
      <LoginButtons mode={resolvedTheme} variant="pill" className="flex flex-col items-stretch gap-3 w-64" buttonClassName="[&>button]:!w-full" />
    </LobbyTemplate>
  )
}