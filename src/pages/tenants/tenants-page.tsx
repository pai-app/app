import { useState } from "react"
import { useOpRunner } from "strata-plugins-ui"
import { GoogleDriveExplorer } from "strata-plugins-ui/google"
import { useAuth, useStrata } from "strata-plugins-ui/react"
import { DefaultTemplate } from "@/templates/default-template"
import { Button } from "@/ui/button"
import { googleProvider, strataConfig } from "@/lib/strata-config"

export function TenantsPage() {
  const { logout } = useAuth()
  const [explorerOpen, setExplorerOpen] = useState(false)
  const strata = useStrata()
  const providers = strataConfig.cloud.providers

  const runner = useOpRunner({
    strata: strata!,
    authService: strataConfig.auth!,
    commonSteps: strataConfig.commonSteps!,
    encryption: strataConfig.encryption ?? undefined,
    wizardClassNames: {
      overlay: 'fixed inset-0 z-50 bg-black/50',
      content: 'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg w-full max-w-md',
      header: 'flex items-center justify-between mb-4',
      title: 'text-lg font-semibold',
      body: '',
      cancel: 'text-sm text-muted-foreground hover:underline',
      counter: 'text-sm text-muted-foreground',
    },
  })

  return (
    <DefaultTemplate>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <div className="flex gap-2">
          {providers.flatMap((p) =>
            p.ops
              .filter((o) => o.placement === 'page-action')
              .map((o) => (
                <Button
                  key={`${p.name}:${o.name}`}
                  onClick={() => { void runner.runOp(p, o) }}
                >
                  {o.label}
                </Button>
              )),
          )}
          <Button variant="outline" onClick={() => setExplorerOpen(true)}>
            Browse Drive
          </Button>
          <Button variant="ghost" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>

      {runner.wizardElement}

      <GoogleDriveExplorer
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        service={googleProvider}
        onSelect={(space, file) => {
          console.log('Selected:', space, file)
          setExplorerOpen(false)
        }}
      />
    </DefaultTemplate>
  )
}