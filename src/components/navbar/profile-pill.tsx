import { useNavigate, useParams } from "react-router"
import { Icon } from "@/ui/icon"
import { Button } from "@/ui/button"
import { useAuth } from "@fyre-db/plugins-ui"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { useNotifications } from "@/providers/notification-provider"
import { useApp } from "@/providers/app-provider"
import { runNotificationAction } from "@/lib/notification-actions"
import { resolveDisplay } from "@/services/notifications"
import { cn } from "@/lib/utils"

type ProfilePillProps = {
  readonly className?: string
}

export function ProfilePill({ className }: ProfilePillProps) {
  const navigate = useNavigate()
  const { tenantId } = useParams()
  const { logout } = useAuth()
  const { notifications, unacknowledgedCount, acknowledge } = useNotifications()
  const { devMode } = useApp()
  const unacknowledged = notifications.filter((n) => !n.acknowledgedAt)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "glass relative flex size-11 cursor-pointer items-center justify-center rounded-full p-0",
            className,
          )}
        >
          <Icon name="user" className="size-4 text-muted-foreground" />
          {unacknowledgedCount > 0 && (
            <span className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-destructive" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="min-w-56">
        <div className="flex justify-center px-1.5 py-1">
          <ThemeSwitcher />
        </div>

        {unacknowledged.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            {unacknowledged.map((n) => {
              const display = resolveDisplay(n.display)
              return (
                <DropdownMenuItem
                  key={n.id}
                  className="flex items-start gap-2"
                  onClick={() => { runNotificationAction(n.ref); acknowledge(n.id) }}
                >
                  <Icon name={display.icon} className={cn("mt-0.5 size-3.5 shrink-0", display.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{n.title}</div>
                    {n.body && <div className="truncate text-xs text-muted-foreground">{n.body}</div>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={(e) => { e.stopPropagation(); acknowledge(n.id) }}
                  >
                    <Icon name="x" className="size-3" />
                  </Button>
                </DropdownMenuItem>
              )
            })}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void navigate(`/t/${tenantId}/settings`)}>
            <Icon name="settings" className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void navigate("/tenants")}>
            <Icon name="arrow-left-right" className="size-4" />
            Switch household
          </DropdownMenuItem>
          {devMode && (
            <DropdownMenuItem onClick={() => void navigate(`/t/${tenantId}/dev`)}>
              <Icon name="terminal" className="size-4" />
              Dev tools
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void logout()
          }}
        >
          <Icon name="log-out" className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
