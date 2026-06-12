import { useEffect, useState } from "react"
import { useStrata } from "@fyre-db/plugins-ui"
import type { BaseEntity } from "@fyre-db/core"
import { Icon } from "@/ui/icon"
import { Button } from "@/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar"
import { authAccountEntity, type AuthAccount } from "@/services/entities"
import { emailImportSettingEntity, type EmailImportSetting } from "@/services/entities/email-import-setting"
import { clientAuth } from "@/lib/strata-config"
import { GOOGLE_AUTH_NAME, MICROSOFT_AUTH_NAME } from "@shared/providers"
import { useImportService } from "@/providers/import-provider"

type AccountRow = AuthAccount & BaseEntity & {
  readonly setting?: EmailImportSetting & BaseEntity
}

export function AccountsSection() {
  const strata = useStrata()
  const { startEmailSync } = useImportService()
  const [accounts, setAccounts] = useState<ReadonlyArray<AccountRow>>([])

  useEffect(() => {
    if (!strata) return
    const authRepo = strata.repo(authAccountEntity)
    const settingsRepo = strata.repo(emailImportSettingEntity)
    const sub = authRepo.observeQuery().subscribe((authAccounts) => {
      const settings = settingsRepo.query()
      const settingsMap = new Map(settings.map((s) => [s.authAccountId, s]))
      setAccounts(
        authAccounts
          .filter((a) => a.feature === "email")
          .map((a) => ({ ...a, setting: settingsMap.get(a.id) })),
      )
    })
    return () => { sub.unsubscribe() }
  }, [strata])

  const handleAddGoogle = () => {
    void clientAuth.supportedAuths().find((a) => a.name === GOOGLE_AUTH_NAME)?.login("email")
  }

  const handleAddMicrosoft = () => {
    void clientAuth.supportedAuths().find((a) => a.name === MICROSOFT_AUTH_NAME)?.login("email")
  }

  const handleSync = (account: AccountRow) => {
    // Fire-and-forget — the import runs in the background. Progress/errors
    // surface via the import log + notifications.
    startEmailSync(account)
  }

  const handleRemove = (account: AccountRow) => {
    if (!strata) return
    strata.repo(authAccountEntity).delete(account.id)
    if (account.setting) {
      strata.repo(emailImportSettingEntity).delete(account.setting.id)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddGoogle}>
            Connect Gmail
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddMicrosoft}>
            Connect Outlook
          </Button>
        </div>
      </div>

      {accounts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No email accounts connected. Connect a Gmail or Outlook account to import bank statements from email.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onSync={() => { handleSync(account) }}
            onRemove={() => { handleRemove(account) }}
          />
        ))}
      </div>
    </div>
  )
}

function AccountCard({
  account,
  onSync,
  onRemove,
}: {
  account: AccountRow
  onSync: () => void
  onRemove: () => void
}) {
  const lastSynced = account.setting?.importState.lastImportAt
  const hasError = !!account.setting?.lastErrorLogId

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <Avatar className="size-10">
        <AvatarImage src={account.picture} alt={account.name} />
        <AvatarFallback>{account.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{account.name}</div>
        <div className="truncate text-xs text-muted-foreground">{account.email}</div>
        {lastSynced && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon name="clock" className="size-3" />
            Synced {formatTimeAgo(lastSynced)}
          </div>
        )}
        {hasError && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <Icon name="triangle-alert" className="size-3" />
            Last sync had errors
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onSync}>
          <Icon name="refresh-cw" className="mr-1 size-3" />
          Sync now
        </Button>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Icon name="trash-2" className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  )
}

function formatTimeAgo(epochMs: number): string {
  const seconds = Math.floor((Date.now() - epochMs) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
