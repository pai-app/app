import { useEffect } from "react"
import { DefaultTemplate } from "@/templates/default-template"
import { Button } from "@/ui/button"
import { useRepo, useQuery, useAuth, useFeature } from "strata-adapters/react"
import { featureAccountDef } from "@/services/entities/feature-account"
import type { AccountMeta } from "@/services/entities/feature-account"

export function HomePage() {
  const repo = useRepo(featureAccountDef)
  const accounts = useQuery(featureAccountDef)
  const { logout } = useAuth()
  const emailImport = useFeature("google", "email-import")

  useEffect(() => {
    if (!repo) return
    const pending = emailImport.consume()
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
  }, [repo, emailImport])

  function handleSetupEmail() {
    emailImport.start()
  }

  return (
    <DefaultTemplate>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome to Fin</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSetupEmail}>
            Setup Email Import
          </Button>
          <Button variant="outline" onClick={() => logout()}>
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
              <div className="flex-1">
                <p className="font-medium">{a.meta.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {a.provider} &middot; {a.feature} &middot; {a.meta.identifier}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created {a.createdAt.toLocaleString()} &middot; Updated {a.updatedAt.toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!repo) return
                  if (confirm(`Disconnect ${a.meta.displayName}?`)) repo.delete(a.id)
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </DefaultTemplate>
  )
}
