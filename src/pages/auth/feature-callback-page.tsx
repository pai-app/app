import { useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { useStrata } from "strata-plugins-ui/react"
import { AuthTemplate } from "@/templates/auth-template"
import { Spinner } from "@/ui/spinner"
import { fetchGoogleUserInfo } from "@/services/core/google-userinfo"

export function FeatureCallbackPage() {
  const navigate = useNavigate()
  const { authService } = useStrata()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current || !authService) return
    processed.current = true

    const params = new URLSearchParams(window.location.hash.slice(1))
    const provider = params.get("provider") ?? ""
    const feature = params.get("feature") ?? ""
    const accessToken = params.get("access_token") ?? ""
    const returnUrl = authService.consumeReturnUrl()

    fetchGoogleUserInfo(accessToken).then((meta) => {
      const handle = authService.feature(provider, feature)
      handle.deposit({
        accessToken,
        refreshToken: params.get("refresh_token") ?? "",
        expiresIn: Number(params.get("expires_in")),
        meta,
      })
      navigate(returnUrl, { replace: true })
    })
  }, [authService, navigate])

  return (
    <AuthTemplate>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner />
        <span>Completing authorization…</span>
      </div>
    </AuthTemplate>
  )
}
