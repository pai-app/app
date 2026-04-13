import { useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router"
import { AuthTemplate } from "@/templates/AuthTemplate"
import { AuthService } from "@/services/core/AuthService"

export function FeatureCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    AuthService.saveFeatureCreds({
      provider: searchParams.get("provider") ?? "",
      feature: searchParams.get("feature") ?? "",
      accessToken: searchParams.get("access_token") ?? "",
      refreshToken: searchParams.get("refresh_token") ?? "",
      expiresIn: Number(searchParams.get("expires_in")),
    })
    navigate(AuthService.consumeReturnUrl(), { replace: true })
  }, [searchParams, navigate])

  return (
    <AuthTemplate>
      <p className="text-muted-foreground">Completing authorization...</p>
    </AuthTemplate>
  )
}
