import { useEffect } from "react"
import { useStrata } from "@fyre-db/plugins-ui"
import { authAccountEntity } from "@/services/entities/auth-account"
import { FEATURE_CREDS_KEY, MICROSOFT_AUTH_NAME } from "@shared/providers"
import { log } from "@/log"

type FeatureCreds = {
  readonly provider: string
  readonly feature: string
  readonly accessToken: string
  readonly refreshToken: string
}

/**
 * Checks sessionStorage for feature creds left by AuthCallbackPage and
 * saves them as AuthAccount entities. Runs when `strata` becomes available
 * (tenant loaded) — the creds are a one-shot value written by the callback.
 */
export function useConsumeFeatureCreds() {
  const strata = useStrata()

  useEffect(() => {
    if (!strata) return
    const raw = sessionStorage.getItem(FEATURE_CREDS_KEY)
    if (!raw) return
    sessionStorage.removeItem(FEATURE_CREDS_KEY)

    let creds: FeatureCreds
    try {
      creds = JSON.parse(raw) as FeatureCreds
    } catch {
      return
    }

    const repo = strata.repo(authAccountEntity)
    void (async () => {
      let userId = ""
      let email = ""
      let name = ""
      let picture = ""
      try {
        const userinfoUrl = creds.provider === MICROSOFT_AUTH_NAME
          ? "https://graph.microsoft.com/v1.0/me"
          : "https://www.googleapis.com/oauth2/v3/userinfo"
        const res = await fetch(userinfoUrl, {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
        })
        if (res.ok) {
          const info = (await res.json()) as {
            sub?: string; id?: string
            email?: string; mail?: string; userPrincipalName?: string
            name?: string; displayName?: string; picture?: string
          }
          userId = info.sub ?? info.id ?? ""
          email = info.email ?? info.mail ?? info.userPrincipalName ?? ""
          name = info.name ?? info.displayName ?? ""
          picture = info.picture ?? ""
        }
      } catch {
        // best-effort
      }
      if (!userId) return
      log.home('saving auth account for %s (%s)', email, creds.provider)
      repo.save({
        provider: creds.provider,
        feature: creds.feature,
        userId,
        email,
        name,
        picture,
        refreshToken: creds.refreshToken,
      })
    })()
  }, [strata])
}
