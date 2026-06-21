import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { FyreDbConfigError } from "@fyre-db/core"
import type { ImportContext } from "@/services/import/import-context"
import { ServicesContext } from "@/providers/services-provider"
import { registerNotificationAction } from "@/lib/notification-actions"

// ── Context shape ───────────────────────────────────────

type ImportContextValue = {
  /** Log id of the import currently shown in the surface (null = closed). */
  readonly openLogId: string | null
  /** Live in-memory context for the open import — null for historical ones. */
  readonly openContext: ImportContext | null
  /** Count of imports currently running or parked awaiting input. */
  readonly activeImportCount: number
  // Actions — all delegate to the service
  readonly startFileImport: (files: File[]) => void
  readonly startEmailSync: (accountId: string) => void
  readonly openSheet: (logId: string) => void
  readonly closeSheet: () => void
}

const ImportCtx = createContext<ImportContextValue | undefined>(undefined)

// ── Provider ────────────────────────────────────────────

type ImportProviderProps = { readonly children: ReactNode }

/**
 * Owns the `ImportService` (kept private) and the identity of the import shown
 * in the surface (`openLogId`). Exposes the open import's live context so the
 * surface can drive prompts/cancel directly on it. The surface derives
 * everything else it renders — the live log row, the email preview — from
 * `openLogId`. All real logic lives in `ImportService`.
 */
export function ImportProvider({ children }: ImportProviderProps) {
  const services = useContext(ServicesContext)
  const service = services?.import ?? null

  const [openLogId, setOpenLogId] = useState<string | null>(null)

  const startFileImport = useCallback((files: File[]) => {
    if (!service) throw new FyreDbConfigError("Import is unavailable until a household is open")
    if (files.length === 0) return
    const logId = service.startFileImport(files[0]) // one file at a time
    setOpenLogId(logId)
  }, [service])

  const startEmailSync = useCallback((accountId: string) => {
    if (!service) throw new FyreDbConfigError("Import is unavailable until a household is open")
    // Background — does NOT open the sheet.
    service.startEmailSync(accountId)
  }, [service])

  const openSheet = useCallback((logId: string) => {
    if (!service) throw new FyreDbConfigError("Import is unavailable until a household is open")
    // Reconnect to a live context if one exists; otherwise resume from the log.
    if (!service.getContext(logId)) {
      service.resume(logId)
    }
    setOpenLogId(logId)
  }, [service])

  const closeSheet = useCallback(() => {
    // Detach the UI only — the import keeps running in the background.
    setOpenLogId(null)
  }, [])

  // Notifications referencing an import log open that import's sheet on click.
  useEffect(() => {
    return registerNotificationAction("import-log", (ref) => { openSheet(ref.logId) })
  }, [openSheet])

  const openContext = openLogId ? service?.getContext(openLogId) ?? null : null
  const activeImportCount = service?.activeImportCount() ?? 0

  const value = useMemo<ImportContextValue>(
    () => ({
      openLogId,
      openContext,
      activeImportCount,
      startFileImport,
      startEmailSync,
      openSheet,
      closeSheet,
    }),
    [openLogId, openContext, activeImportCount, startFileImport, startEmailSync, openSheet, closeSheet],
  )

  return <ImportCtx.Provider value={value}>{children}</ImportCtx.Provider>
}

// ── Hook ────────────────────────────────────────────────

export function useImportService(): ImportContextValue {
  const ctx = useContext(ImportCtx)
  if (!ctx) throw new FyreDbConfigError("useImportService must be used within an ImportProvider")
  return ctx
}
