import { useEffect } from "react"
import { useNavigate } from "react-router"
import { LoginButtons } from "strata-plugins-ui"
import { useAuth } from "strata-plugins-ui/react"
import { AuthTemplate } from "@/templates/auth-template"

export function LoginPage() {
  const navigate = useNavigate()
  const { status, name } = useAuth()

  useEffect(() => {
    if (status === "signed-in" && name) {
      navigate("/tenants")
    }
  }, [status, name, navigate])

  return (
    <AuthTemplate>
      <LoginButtons />
    </AuthTemplate>
  )
}