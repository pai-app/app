import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useStrata } from "@strata/plugins-ui"
import { StrataConfigError } from "@strata/core"
import type { BaseEntity } from "@strata/core"
import { ImportService } from "@/services/import/import-service"
import type { ImportContext } from "@/services/import/import-context"
import { type AuthAccount } from "@/services/entities/auth-account"
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
  readonly startEmailSync: (account: AuthAccount & BaseEntity) => void
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
  const strata = useStrata()
  const service = useMemo(() => strata ? new ImportService(strata) : null, [strata])

  const [openLogId, setOpenLogId] = useState<string | null>(null)

  const startFileImport = useCallback((files: File[]) => {
    if (!service || files.length === 0) return
    const logId = service.startFileImport(files[0]) // one file at a time
    setOpenLogId(logId)
  }, [service])

  const startEmailSync = useCallback((account: AuthAccount & BaseEntity) => {
    // Background — does NOT open the sheet.
    service?.startEmailSync(account)
  }, [service])

  const openSheet = useCallback((logId: string) => {
    if (!service) return
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
  if (!ctx) throw new StrataConfigError("useImportService must be used within an ImportProvider")
  return ctx
}
