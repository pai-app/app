import { useState } from "react"
import { useNavigate } from "react-router"
import { TenantOps, TenantList } from "strata-plugins-ui"
import { GoogleDriveExplorer } from "strata-plugins-ui/google"
import { useAuth } from "strata-plugins-ui/react"
import { DefaultTemplate } from "@/templates/default-template"
import { Button } from "@/ui/button"
import { googleProvider } from "@/lib/strata-config"

const wizardClassNames = {
  overlay: 'fixed inset-0 z-50 bg-black/50',
  content: 'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg w-full max-w-md',
  header: 'flex items-center justify-between mb-4',
  title: 'text-lg font-semibold',
  body: '',
  cancel: 'text-sm text-muted-foreground hover:underline',
  counter: 'text-sm text-muted-foreground',
}

export function TenantsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [explorerOpen, setExplorerOpen] = useState(false)

  return (
    <DefaultTemplate>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <div className="flex gap-2">
          <TenantOps classNames={{ wizard: wizardClassNames, button: "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 p-1.5" }} />
          <Button variant="outline" onClick={() => setExplorerOpen(true)}>
            Browse Drive
          </Button>
          <Button variant="ghost" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>

      <TenantList
        classNames={{ wizard: wizardClassNames }}
        onSelect={(t) => navigate(`/t/${t.id}`)}
      />

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