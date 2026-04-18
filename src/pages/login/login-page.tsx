import { GoogleLoginButton } from "strata-plugins-ui/google"
import { useAuth } from "strata-plugins-ui/react"
import { AuthTemplate } from "@/templates/auth-template"

export function LoginPage() {
  const { login } = useAuth()
  return (
    <AuthTemplate>
      <GoogleLoginButton onClick={() => login("google")} theme="dark" variant="pill" />
    </AuthTemplate>
  )
}
