import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { Button } from "@/ui/button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { GoogleDriveExplorer, useAuth, useStrata } from "@strata/plugins-ui"
import { useTheme } from "@/providers/theme-provider"
import { FEATURE_CREDS_KEY, GOOGLE_AUTH_NAME } from "@shared/providers"
import { authAccountEntity, moneyAccountEntity, MONEY_ACCOUNT_KINDS, type AuthAccount, type MoneyAccount, type MoneyAccountKind } from "@/services/entities"
import type { BaseEntity } from "@strata/core"
import { clientAuth, googleProvider } from "@/lib/strata-config"
import { TagPicker } from "@/components/tag-picker"
import { useEntity, type DisplayTag } from "@/providers/entity-provider"
import { Money } from "@/ui/money"
import { MoneyAccountIcon } from "@/ui/money-account-icon"
import { TagIcon } from "@/ui/tag-icon"
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
  const { accounts: moneyAccounts } = useEntity()
  const [accounts, setAccounts] = useState<ReadonlyArray<AuthAccount & BaseEntity>>([]
  )
  const [driveOpen, setDriveOpen] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<DisplayTag | null>(null)

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

  const handleAddRandomAccount = () => {
    if (!strata) return
    strata.repo(moneyAccountEntity).save(randomAccount())
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
          <h2 className="text-lg font-semibold">Money accounts</h2>
          <Button onClick={handleAddRandomAccount}>Add random account</Button>
        </div>
        {moneyAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No money accounts yet.</p>
        ) : (
          <ul className="space-y-2">
            {moneyAccounts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <MoneyAccountIcon account={a} className="size-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {a.name}
                      {a.archived && <span className="ml-2 text-xs text-muted-foreground">(archived)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.kind} · {a.currency}
                      {a.bankId && ` · ${a.bankId}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Money amount={a.initialBalance / 100} currency={a.currency} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!strata) return
                      strata.repo(moneyAccountEntity).delete(a.id)
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tag picker</h2>
          <TagPicker
            open={tagPickerOpen}
            onOpenChange={setTagPickerOpen}
            selectedTagId={selectedTag?.id ?? null}
            onSelect={setSelectedTag}
          >
            <Button variant="outline">
              {selectedTag ? (
                <>
                  <TagIcon tag={selectedTag} className="size-4" />
                  {selectedTag.name}
                </>
              ) : (
                "Pick a tag…"
              )}
            </Button>
          </TagPicker>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedTag
            ? `Selected: ${selectedTag.name} (id: ${selectedTag.id}). Open the picker again to see the Remove option.`
            : "No tag selected yet."}
        </p>
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

// ─── Sample data ─────────────────────────────────────────

// Bank ids that resolve to a brand icon via `<MoneyAccountIcon>`. Names are
// purely for the demo; the real bank registry will live in fin-parsers (A1).
const SAMPLE_BANKS: readonly { readonly id: string; readonly name: string }[] = [
  { id: "hdfc", name: "HDFC Bank" },
  { id: "federal", name: "Federal Bank" },
  { id: "paytm", name: "Paytm Payments Bank" },
  { id: "jupiter", name: "Jupiter" },
]

const SAMPLE_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const

const KIND_LABEL: Record<MoneyAccountKind, string> = {
  bank: "Savings",
  "credit-card": "Credit Card",
  cash: "Cash",
  wallet: "Wallet",
  loan: "Loan",
  investment: "Investments",
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomAccount(): MoneyAccount {
  const kind = pick(MONEY_ACCOUNT_KINDS)
  const useBank = kind === "bank" || kind === "credit-card"
  const bank = useBank ? pick(SAMPLE_BANKS) : undefined
  const accountNumber = String(1_000_000_000 + Math.floor(Math.random() * 9_000_000_000))

  // Initial balance in minor units. Credit cards usually start at zero,
  // others at a random positive amount up to 1,000,000.00 (in major units).
  const initialBalance = kind === "credit-card"
    ? 0
    : Math.floor(Math.random() * 100_000_000)

  return {
    kind,
    name: bank ? `${bank.name} ${KIND_LABEL[kind]}` : KIND_LABEL[kind],
    currency: pick(SAMPLE_CURRENCIES),
    initialBalance,
    bankId: bank?.id,
    metadata: useBank ? { accountNumber: [accountNumber] } : undefined,
  }
}