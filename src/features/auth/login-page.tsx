import { useEffect } from "react"
import { useNavigate } from "react-router"
import { LoginButtons, useStatus } from "@fyre-db/plugins-ui"
import { LobbyTemplate } from "@/templates/lobby-template"
import { useTheme } from "@/providers/theme-provider"

export function LoginPage() {
  const navigate = useNavigate()
  const status = useStatus()
  const { resolvedTheme } = useTheme()
  const signedIn = status !== "connecting" && status !== "signed-out"

  useEffect(() => {
    if (signedIn) {
      void navigate("/tenants", { replace: true })
    }
  }, [signedIn, navigate])

  return (
    <LobbyTemplate>
      <LoginButtons mode={resolvedTheme} variant="pill" className="flex flex-col items-stretch gap-3 w-64" buttonClassName="[&>button]:!w-full" />
    </LobbyTemplate>
  )
}