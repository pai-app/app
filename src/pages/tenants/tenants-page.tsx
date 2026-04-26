import { useState } from "react"
import { useNavigate } from "react-router"
import { LogOut, FolderOpen, EllipsisVertical, Plus, Trash2 } from "lucide-react"
import { TenantOps, TenantList } from "strata-plugins-ui"
import { GoogleDriveExplorer } from "strata-plugins-ui/google"
import { useAuth, useTenant } from "strata-plugins-ui/react"
import { LobbyTemplate } from "@/templates/lobby-template"
import { Button } from "@/ui/button"
import { useTheme } from "@/providers/theme-provider"
import { googleProvider } from "@/lib/strata-config"

const wizardClassNames = {
  overlay: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
  content:
    "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 [height:fit-content] [max-height:calc(100vh-32px)]",
  header: "hidden",
  title: "",
  body: "",
  cancel: "",
  counter: "",
}

const addHouseholdButtonClasses =
  "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 h-10 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"

const tenantListClassNames = {
  root: "flex w-full max-w-md flex-col gap-2 list-none p-0",
  empty:
    "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground",
  row: "group flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-foreground/20 hover:shadow-sm",
  rowName:
    "flex-1 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary",
  menu: "relative",
  menuTrigger:
    "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-lg text-muted-foreground hover:bg-muted hover:text-foreground list-none [&::-webkit-details-marker]:hidden",
  actions: "absolute right-0 top-full z-10 mt-1 min-w-36 list-none rounded-md border border-border bg-popover p-1 shadow-md",
  action:
    "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted",
  wizard: wizardClassNames,
}

export function TenantsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { ops, refreshList } = useTenant()
  const { resolvedTheme } = useTheme()
  const [explorerOpen, setExplorerOpen] = useState(false)

  return (
    <LobbyTemplate
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExplorerOpen(true)}
            aria-label="Browse Drive"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      }
    >
      <TenantOps
        mode={resolvedTheme}
        labels={{
          create: <><Plus className="h-4 w-4" /> Create</>,
        }}
        classNames={{
          wizard: wizardClassNames,
          button: addHouseholdButtonClasses,
        }}
      />

      <TenantList
        classNames={tenantListClassNames}
        labels={{
          menuTrigger: <EllipsisVertical className="h-4 w-4" />,
          delete: <><Trash2 className="h-4 w-4" /> Delete</>,
        }}
        onSelect={(t) => navigate(`/t/${t.id}`)}
        onDelete={(t) => {
          void ops.remove(t.id).then(() => refreshList())
        }}
      />

      <GoogleDriveExplorer
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        service={googleProvider}
        mode={resolvedTheme}
        onSelect={(space, file) => {
          console.log("Selected:", space, file)
          setExplorerOpen(false)
        }}
      />
    </LobbyTemplate>
  )
}