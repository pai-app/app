import { useNavigate } from "react-router"
import { LoginPage as PluginLoginPage } from "strata-plugins-ui"
import { GOOGLE_AUTH_NAME } from "@shared/providers"
import { AuthTemplate } from "@/templates/auth-template"

export function LoginPage() {
  const navigate = useNavigate()
  return (
    <AuthTemplate>
      <PluginLoginPage
        onAuthenticated={(name) => {
          if (name === GOOGLE_AUTH_NAME) navigate("/tenants")
        }}
      />
    </AuthTemplate>
  )
}