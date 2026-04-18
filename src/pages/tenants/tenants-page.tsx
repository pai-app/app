import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { useTenantList, useAuth, useStrata } from "strata-adapters/react"
import {
  useGoogleCreateForm,
  GoogleDriveFileService,
} from "strata-adapters/providers/google"
import { GoogleDriveExplorer } from "strata-plugins-ui/google"
import type { CloudFile, CloudSpace } from "strata-adapters/cloud"
import { DefaultTemplate } from "@/templates/default-template"
import { Button } from "@/ui/button"
import { Spinner } from "@/ui/spinner"

export function TenantsPage() {
  const { tenants, loading } = useTenantList()
  const [showCreate, setShowCreate] = useState(false)
  const [showExplorer, setShowExplorer] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <DefaultTemplate>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExplorer(true)}>
            Browse Drive (debug)
          </Button>
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            New Workspace
          </Button>
          <Button variant="ghost" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          <span>Loading workspaces…</span>
        </div>
      )}

      {!loading && tenants.length === 0 && !showCreate && (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">No workspaces yet.</p>
          <Button onClick={() => setShowCreate(true)}>Create your first workspace</Button>
        </div>
      )}

      {!loading && tenants.length > 0 && (
        <ul className="mt-6 space-y-2">
          {tenants.map((t) => (
            <li key={t.id}>
              <button
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted"
                onClick={() => navigate(`/t/${t.id}`)}
              >
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {t.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateTenantForm onClose={() => setShowCreate(false)} />
      )}

      <DriveExplorerDebug open={showExplorer} onOpenChange={setShowExplorer} />
    </DefaultTemplate>
  )
}

function CreateTenantForm({ onClose }: { onClose: () => void }) {
  const form = useGoogleCreateForm()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const tenant = await form.submit()
    if (tenant) {
      navigate(`/t/${tenant.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-border p-4">
      <h2 className="text-lg font-medium">New Workspace</h2>

      <div className="space-y-1">
        <label htmlFor="tenant-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="tenant-name"
          type="text"
          value={form.state.name}
          onChange={(e) => form.setName(e.target.value)}
          placeholder="My Workspace"
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="shareable"
          type="checkbox"
          checked={form.state.shareable}
          onChange={(e) => form.setShareable(e.target.checked)}
          className="size-4 rounded border-border"
        />
        <label htmlFor="shareable" className="text-sm">
          Shareable (store in Google Drive instead of app data)
        </label>
      </div>

      {form.state.error && (
        <p className="text-sm text-destructive">{form.state.error.message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={form.state.submitting || !form.state.name.trim()}>
          {form.state.submitting ? "Creating..." : "Create"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

/** Temporary debug surface — exercises <CloudFileExplorer> against Google Drive. */
function DriveExplorerDebug({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { authService } = useStrata()
  const [picked, setPicked] = useState<{ space: CloudSpace; file: CloudFile } | null>(null)

  const service = useMemo(() => {
    if (!authService) return null
    return new GoogleDriveFileService({
      getAccessToken: async () => {
        const token = await authService.getAccessToken()
        if (!token) throw new Error("Not signed in")
        return token
      },
    })
  }, [authService])

  if (!service) return null

  return (
    <>
      {picked && (
        <p className="mt-6 text-sm text-muted-foreground">
          Picked: <span className="font-medium">{picked.file.name}</span> in{" "}
          <span className="font-medium">{picked.space.displayName}</span>
        </p>
      )}
      <GoogleDriveExplorer
        theme="dark"
        open={open}
        onOpenChange={onOpenChange}
        service={service}
        onSelect={(space, file) => setPicked({ space, file })}
      />
    </>
  )
}
