import type { BaseEntity } from "@fyre-db/core"
import { Icon } from "@/ui/icon"
import { Button } from "@/ui/button"
import { Progress } from "@/ui/progress"
import { sweepProgress, type ImportLog } from "@/entities/import-log"
import { useImportService } from "@/providers/import-provider"
import { useObservable } from "@/providers/use-observable"
import { useObservableQuery } from "@/providers/use-observable-query"
import { useServices } from "@/providers/services-provider"

export function ImportsSection() {
  const { startFileImport, openSheet } = useImportService()
  const { settings, import: importSvc } = useServices()
  const monthKeys = useObservable(settings.monthKeys$)
  const { value: logs } = useObservableQuery(
    () => importSvc.observeLogs(monthKeys),
    [importSvc, monthKeys],
    [] as readonly (ImportLog & BaseEntity)[],
  )

  const sorted = [...logs].sort((a, b) => b.triggeredAt - a.triggeredAt)

  const handleFilePick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".pdf,.xlsx,.xls"
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        startFileImport(Array.from(input.files))
      }
    }
    input.click()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={handleFilePick}>
          <Icon name="upload" className="mr-1 size-3" />
          Import file
        </Button>
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No imports yet. Drop a file anywhere or click "Import file" to get started.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((logEntry) => (
          <LogRow
            key={logEntry.id}
            log={logEntry}
            onOpen={() => { openSheet(logEntry.id) }}
          />
        ))}
      </div>
    </div>
  )
}

function LogRow({ log, onOpen }: { log: ImportLog & BaseEntity; onOpen: () => void }) {
  const statusIcon = getStatusIcon(log.status)
  const sourceLabel = log.source.kind === "file"
    ? log.source.fileName
    : `Email — ${log.source.from}`
  const needsAttention = log.status === "needs_input" ||
    (log.status === "failed" && log.error?.kind === "password-required")

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50"
    >
      <Icon name={statusIcon.icon} className={`size-4 shrink-0 ${statusIcon.color}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{sourceLabel}</div>
        <div className="text-xs text-muted-foreground">
          {formatDate(log.triggeredAt)}
          {log.adapterId && ` · ${log.adapterId}`}
        </div>
        {log.status === "in_progress" && log.emailRun && <MiniSweepBar run={log.emailRun} />}
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">
        {log.counts.new > 0 && <span className="text-green-600">{log.counts.new} new</span>}
        {log.counts.new > 0 && log.counts.duplicate > 0 && " · "}
        {log.counts.duplicate > 0 && <span>{log.counts.duplicate} dup</span>}
      </div>
      {needsAttention && (
        <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          Resolve
        </span>
      )}
      {log.status === "failed" && !needsAttention && log.error && (
        <span className="shrink-0 text-xs text-destructive" title={log.error.message}>
          {log.error.kind}
        </span>
      )}
    </button>
  )
}

/** Thin live progress bar for an in-flight email sweep, labelled with the
 *  month-year the cursor has reached. */
function MiniSweepBar({ run }: { run: NonNullable<ImportLog["emailRun"]> }) {
  const { value } = sweepProgress(run, true)
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <Progress value={value * 100} className="h-1 flex-1" />
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {new Date(run.cursorAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
      </span>
    </div>
  )
}

function getStatusIcon(status: ImportLog["status"]): { icon: string; color: string } {
  switch (status) {
    case "completed": return { icon: "circle-check", color: "text-green-600" }
    case "failed": return { icon: "circle-x", color: "text-destructive" }
    case "cancelled": return { icon: "circle-x", color: "text-muted-foreground" }
    case "in_progress": return { icon: "refresh-cw", color: "text-blue-500 animate-spin" }
    case "needs_input": return { icon: "clock", color: "text-amber-500" }
    case "pending": return { icon: "circle-dashed", color: "text-muted-foreground" }
  }
}

function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
