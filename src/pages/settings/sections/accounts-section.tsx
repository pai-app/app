import { Icon } from "@/ui/icon"
import { Button } from "@/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar"
import { useServices } from "@/providers/services-provider"
import { useObservable } from "@/lib/use-observable"
import type { ConnectionView } from "@/services/connections-service"
import { useImportService } from "@/providers/import-provider"

export function AccountsSection() {
  const { connections: connectionsService } = useServices()
  const connections = useObservable(connectionsService.connections$)
  const { startEmailSync } = useImportService()

  const handleAddGoogle = () => {
    connectionsService.connectGoogle()
  }

  const handleAddMicrosoft = () => {
    connectionsService.connectMicrosoft()
  }

  const handleSync = (connection: ConnectionView) => {
    // Fire-and-forget — the import runs in the background. Progress/errors
    // surface via the import log + notifications.
    startEmailSync(connection.id)
  }

  const handleRemove = (connection: ConnectionView) => {
    connectionsService.disconnect(connection.id)
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

      {connections.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No email accounts connected. Connect a Gmail or Outlook account to import bank statements from email.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {connections.map((connection) => (
          <AccountCard
            key={connection.id}
            connection={connection}
            onSync={() => { handleSync(connection) }}
            onRemove={() => { handleRemove(connection) }}
          />
        ))}
      </div>
    </div>
  )
}

function AccountCard({
  connection,
  onSync,
  onRemove,
}: {
  connection: ConnectionView
  onSync: () => void
  onRemove: () => void
}) {
  const lastSynced = connection.lastSyncedAt
  const hasError = connection.hasError

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <Avatar className="size-10">
        <AvatarImage src={connection.picture} alt={connection.name} />
        <AvatarFallback>{connection.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{connection.name}</div>
        <div className="truncate text-xs text-muted-foreground">{connection.email}</div>
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
