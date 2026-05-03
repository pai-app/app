import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { Button } from "@/ui/button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { GoogleDriveExplorer, useAuth, useStrata } from "@strata/plugins-ui"
import { useTheme } from "@/providers/theme-provider"
import { FEATURE_CREDS_KEY, GOOGLE_AUTH_NAME } from "@shared/providers"
import { authAccountEntity, type AuthAccount } from "@/services/entities"
import type { BaseEntity } from "@strata/core"
import { clientAuth, googleProvider } from "@/lib/strata-config"
import { Icon } from "@/ui/icon"
import { IconPicker } from "@/components/icon-picker"
import { log } from "@/log"

type FeatureCreds = {
  readonly provider: string
  readonly feature: string
  readonly accessToken: string
  readonly refreshToken: string
}

export function HomePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const strata = useStrata()
  const location = useLocation()
  const { resolvedTheme } = useTheme()
  const [accounts, setAccounts] = useState<ReadonlyArray<AuthAccount & BaseEntity>>([]
  )
  const [driveOpen, setDriveOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedIcons, setSelectedIcons] = useState<readonly string[]>([
    'wallet', 'coffee', 'pizza',           // lucide
    'auto', 'goldbar', 'tiffin',            // tsx (custom lucide-style)
    'netflix', 'spotify',                   // simple-icons (brand)
    'blinkit', 'zomato', 'fastag',          // svg (custom brand)
  ])
  const [iconSize, setIconSize] = useState(32)
  const [iconColor, setIconColor] = useState('#3b82f6')
  const [iconStrokeWidth, setIconStrokeWidth] = useState(2)
  const [iconOpacity, setIconOpacity] = useState(1)
  const [iconRotation, setIconRotation] = useState(0)

  // Check for feature creds returned from the auth callback page
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
  }, [strata, location])

  // Load and observe auth accounts
  useEffect(() => {
    if (!strata) return
    const repo = strata.repo(authAccountEntity)
    const sub = repo.observeQuery().subscribe(setAccounts)
    return () => { sub.unsubscribe(); }
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
          <Button variant="outline" onClick={() => void navigate("/tenants")}>
            Households
          </Button>
          <ThemeSwitcher />
          <Button variant="outline" onClick={() => void logout()}>
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

      <div className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Icons</h2>
          <Button onClick={() => { setPickerOpen((o) => !o); }}>
            {pickerOpen ? 'Close picker' : 'Open icon picker'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Size: {iconSize}px</span>
            <input
              type="range"
              min={12}
              max={96}
              value={iconSize}
              onChange={(e) => { setIconSize(Number(e.target.value)) }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Color</span>
            <input
              type="color"
              value={iconColor}
              onChange={(e) => { setIconColor(e.target.value) }}
              className="h-8 w-full rounded border"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Stroke: {iconStrokeWidth}</span>
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.5}
              value={iconStrokeWidth}
              onChange={(e) => { setIconStrokeWidth(Number(e.target.value)) }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Opacity: {iconOpacity.toFixed(2)}</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={iconOpacity}
              onChange={(e) => { setIconOpacity(Number(e.target.value)) }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Rotate: {iconRotation}°</span>
            <input
              type="range"
              min={0}
              max={360}
              step={15}
              value={iconRotation}
              onChange={(e) => { setIconRotation(Number(e.target.value)) }}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          {selectedIcons.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="flex items-center justify-center rounded-lg border bg-muted/30"
              style={{
                width: iconSize + 24,
                height: iconSize + 24,
                color: iconColor,
              }}
              title={name}
            >
              <Icon
                name={name}
                width={iconSize}
                height={iconSize}
                strokeWidth={iconStrokeWidth}
                style={{
                  opacity: iconOpacity,
                  transform: `rotate(${iconRotation.toString()}deg)`,
                }}
              />
            </div>
          ))}
        </div>
        {pickerOpen && (
          <div className="rounded-lg border p-4">
            <IconPicker
              pack="tag-icons"
              onChange={(key) => {
                setSelectedIcons((prev) => [key, ...prev.filter((k) => k !== key)].slice(0, 20))
                setPickerOpen(false)
              }}
              className="max-h-96 overflow-y-auto"
            />
          </div>
        )}
      </div>

      <div className="mt-12">
        <Button onClick={() => { setDriveOpen(true); }}>Browse Google Drive</Button>
        <GoogleDriveExplorer
          open={driveOpen}
          onOpenChange={setDriveOpen}
          service={googleProvider}
          mode={resolvedTheme === "dark" ? "dark" : "light"}
          onSelect={(_space, _file) => {
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