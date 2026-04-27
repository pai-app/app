import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { Button } from "@/ui/button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { GoogleDriveExplorer } from "strata-plugins-ui/google"
import { useAuth, useStrata } from "strata-plugins-ui/react"
import { useTheme } from "@/providers/theme-provider"
import { FEATURE_CREDS_KEY, GOOGLE_AUTH_NAME } from "@shared/providers"
import { authAccountEntity, type AuthAccount } from "@/services/entities"
import type { BaseEntity } from "strata-data-sync"
import { clientAuth, googleProvider } from "@/lib/strata-config"

export function HomePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const strata = useStrata()
  const location = useLocation()
  const { resolvedTheme } = useTheme()
  const [accounts, setAccounts] = useState<ReadonlyArray<AuthAccount & BaseEntity>>([]
  )
  const [driveOpen, setDriveOpen] = useState(false)

  // Check for feature creds returned from the auth callback page
  useEffect(() => {
    if (!strata) return
    const raw = sessionStorage.getItem(FEATURE_CREDS_KEY)
    if (!raw) return
    sessionStorage.removeItem(FEATURE_CREDS_KEY)

    let creds: { provider: string; feature: string; accessToken: string; refreshToken: string }
    try {
      creds = JSON.parse(raw)
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
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
        })
        if (res.ok) {
          const info = (await res.json()) as { sub?: string; email?: string; name?: string; picture?: string }
          userId = info.sub ?? ""
          email = info.email ?? ""
          name = info.name ?? ""
          picture = info.picture ?? ""
        }
      } catch {
        // best-effort
      }
      if (!userId) return
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
  }, [strata, location])

  // Load and observe auth accounts
  useEffect(() => {
    if (!strata) return
    const repo = strata.repo(authAccountEntity)
    const sub = repo.observeQuery().subscribe(setAccounts)
    return () => sub.unsubscribe()
  }, [strata])

  const handleAddEmail = () => {
    void clientAuth.supportedAuths()
      .find((a) => a.name === GOOGLE_AUTH_NAME)
      ?.login("email")
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome to Fin</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/tenants")}>
            Households
          </Button>
          <ThemeSwitcher />
          <Button variant="outline" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Connected Accounts</h2>
          <Button onClick={handleAddEmail}>Add Email Account</Button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-muted-foreground">No accounts connected yet.</p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((a) => (
              <li key={a.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {a.picture && (
                      <img src={a.picture} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
                    )}
                    <div>
                      <span className="font-medium">{a.name || a.provider}</span>
                      {a.email && <span className="ml-2 text-sm text-muted-foreground">{a.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{a.feature}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!strata) return
                        strata.repo(authAccountEntity).delete(a.id)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <dt>ID</dt><dd className="font-mono truncate">{a.id}</dd>
                  <dt>Created</dt><dd>{a.createdAt.toLocaleString()}</dd>
                  <dt>Updated</dt><dd>{a.updatedAt.toLocaleString()}</dd>
                  <dt>Version</dt><dd>{a.version}</dd>
                  <dt>Device</dt><dd className="font-mono truncate">{a.device}</dd>
                  <dt>Refresh Token</dt><dd className="font-mono truncate">{a.refreshToken.slice(0, 20)}…</dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-12">
        <Button onClick={() => setDriveOpen(true)}>Browse Google Drive</Button>
        <GoogleDriveExplorer
          open={driveOpen}
          onOpenChange={setDriveOpen}
          service={googleProvider}
          mode={resolvedTheme === "dark" ? "dark" : "light"}
          onSelect={(space, file) => {
            console.log("Selected:", space, file)
            setDriveOpen(false)
          }}
        />
      </div>

      <div className="mt-12 space-y-4">
        <h2 className="text-lg font-semibold">Scroll Placeholder</h2>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <h3 className="font-medium">Section {i + 1}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
              dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
          </div>
        ))}
      </div>
    </>
  )
}