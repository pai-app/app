import { GoogleLoginButton } from "strata-adapters/providers/google"
import { useAuth } from "strata-adapters/react"
import { AuthTemplate } from "@/templates/auth-template"

export function LoginPage() {
  const { login } = useAuth()
  return (
    <AuthTemplate>
      <GoogleLoginButton onClick={() => login("google")} theme="dark" variant="pill" />
    </AuthTemplate>
  )
}
