import { useNavigate } from "react-router"
import { useState } from "react"
import { Icon } from "@/ui/icon"
import { useOpRunner, useTenant } from "@fyre-db/plugins-ui"
import type { CloudProvider, ProviderOp } from "@fyre-db/plugins-ui"
import { LobbyTemplate } from "@/templates/lobby-template"
import { Avatar, AvatarFallback } from "@/ui/avatar"
import { Button } from "@/ui/button"
import { Card } from "@/ui/card"
import { Text } from "@/ui/text"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
import { useTheme } from "@/providers/theme-provider"
import { getColor } from "@/lib/colors"
import { getInitials } from "@/lib/text"
import { providers } from "@/lib/strata-config"

const wizardClassNames = {
  overlay: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
  content:
    "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 h-fit max-h-[calc(100vh-32px)]",
  header: "hidden",
}

export function TenantsPage() {
  const navigate = useNavigate()
  const { all: tenants, ops, pageActions } = useTenant()
  const { resolvedTheme } = useTheme()
  const [error, setError] = useState<string | null>(null)

  const handleError = (err: Error, _op: ProviderOp, _provider: CloudProvider) => {
    setError(err.message)
    setTimeout(() => { setError(null) }, 5000)
  }

  const runner = useOpRunner({
    mode: resolvedTheme,
    wizardClassNames,
    onError: handleError,
  })

  const handleRemove = async (id: string) => {
    try {
      await ops.remove(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove')
      setTimeout(() => { setError(null) }, 5000)
    }
  }

  return (
    <LobbyTemplate>
      <div className="flex w-full max-w-2xl flex-col items-center gap-5">
        {error && (
          <div className="w-full rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {tenants.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Text variant="muted">
              No households yet
            </Text>
            {pageActions.map(({ provider, op }) => (
              <Button
                key={`${provider.name}:${op.name}`}
                variant="outline"
                onClick={() => { void runner.runOp(provider, op) }}
              >
                {op.icon}
                {op.label}
              </Button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex w-full items-center justify-between">
              <Text variant="label">
                Your households
              </Text>
              {pageActions.map(({ provider, op }) => (
                <Button
                  key={`${provider.name}:${op.name}`}
                  variant="outline"
                  size="sm"
                  onClick={() => { void runner.runOp(provider, op) }}
                >
                  {op.icon}
                  {op.label}
                </Button>
              ))}
            </div>
            <div className="flex w-full flex-wrap gap-3">
              {tenants.map((t) => {
                const menuOps = [
                  ...providers.tenantActions(t),
                  ...providers.tenantMenu(t),
                ]
                const initials = getInitials(t.name)
                const color = getColor(t.name)
                return (
                  <Card
                    key={t.id}
                    size="sm"
                    className="group relative w-44 cursor-pointer items-center p-5 transition-all hover:bg-accent/50"
                    onClick={() => void navigate(`/t/${t.id}`)}
                  >
                    <Avatar size="lg">
                      <AvatarFallback className={`${color.bg} ${color.text} ${color.darkText}`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <Text size="sm" weight="medium" className="w-full truncate text-center">
                      {t.name}
                    </Text>
                    <div
                      className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs">
                            <Icon name="ellipsis-vertical" className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {menuOps.map(({ provider, op }) => (
                            <DropdownMenuItem
                              key={op.name}
                              onClick={() => { void runner.runOp(provider, op, t) }}
                            >
                              {op.icon}
                              {op.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem
                            onClick={() => { void handleRemove(t.id) }}
                          >
                            <Icon name="trash-2" className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>

      {runner.wizardElement}
    </LobbyTemplate>
  )
}