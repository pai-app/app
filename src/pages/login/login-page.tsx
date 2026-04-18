import { LoginButtons } from "strata-adapters/react"
import { AuthTemplate } from "@/templates/auth-template"

export function LoginPage() {
  return (
    <AuthTemplate>
      <LoginButtons />
    </AuthTemplate>
  )
}
