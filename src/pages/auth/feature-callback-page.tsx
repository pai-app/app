import { useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { AuthTemplate } from "@/templates/auth-template"
import { Spinner } from "@/ui/spinner"
import { googleAuthService } from "@/lib/strata-config"
import { fetchGoogleUserInfo } from "@/services/core/google-userinfo"

export function FeatureCallbackPage() {
  const navigate = useNavigate()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const params = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = params.get("access_token") ?? ""
    const returnUrl = googleAuthService.consumeReturnUrl()

    fetchGoogleUserInfo(accessToken).then((meta) => {
      googleAuthService.saveFeatureCreds({
        provider: params.get("provider") ?? "",
        feature: params.get("feature") ?? "",
        accessToken,
        refreshToken: params.get("refresh_token") ?? "",
        expiresIn: Number(params.get("expires_in")),
        meta,
      })
      navigate(returnUrl, { replace: true })
    })
  }, [navigate])

  return (
    <AuthTemplate>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner />
        <span>Completing authorization…</span>
      </div>
    </AuthTemplate>
  )
}
