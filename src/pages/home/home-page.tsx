import { useEffect } from "react"
import { DefaultTemplate } from "@/templates/default-template"
import { Button } from "@/ui/button"
import { authService } from "@/services/core/auth-service"
import { useRepo, useQuery } from "strata-adapters/react"
import { featureAccountDef } from "@/services/entities/feature-account"
import type { AccountMeta } from "@/services/entities/feature-account"

export function HomePage() {
  const repo = useRepo(featureAccountDef)
  const accounts = useQuery(featureAccountDef)

  useEffect(() => {
    if (!repo) return
    const pending = authService.consumeFeatureCreds()
    if (!pending) return

    const meta = (pending.meta ?? {}) as AccountMeta
    repo.save({
      provider: pending.provider,
      feature: pending.feature,
      accessToken: pending.accessToken,
      refreshToken: pending.refreshToken,
      expiresAt: Date.now() + pending.expiresIn * 1000,
      meta,
    })
  }, [repo])

  function handleSetupEmail() {
    authService.featureLogin("google", "email-import")
  }

  return (
    <DefaultTemplate>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome to Fin</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSetupEmail}>
            Setup Email Import
          </Button>
          <Button variant="outline" onClick={() => authService.logout()}>
            Logout
          </Button>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="mt-4 space-y-3">
          <h2 className="text-lg font-semibold">Connected Accounts</h2>
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
              {a.meta.avatarUrl && (
                <img src={a.meta.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
              )}
              <div>
                <p className="font-medium">{a.meta.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {a.provider} &middot; {a.feature} &middot; {a.meta.identifier}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created {a.createdAt.toLocaleString()} &middot; Updated {a.updatedAt.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DefaultTemplate>
  )
}
