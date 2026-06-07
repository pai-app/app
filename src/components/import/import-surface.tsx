import { useEffect, useState } from "react"
import { useStrata } from "@strata/plugins-ui"
import type { BaseEntity } from "@strata/core"
import { AdaptiveSurface } from "@/components/adaptive-surface"
import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { Spinner } from "@/ui/spinner"
import { useImportService } from "@/providers/import-provider"
import { useEmailPreview } from "@/components/import/use-email-preview"
import { PasswordPrompt, AccountSelectionPrompt, ConfirmPrompt } from "@/components/import/import-prompts"
import type { ContextStatus } from "@/services/import/import-context"
import { importLogEntity, type ImportLog } from "@/services/entities/import-log"
import type { EmailPreview } from "@/services/email-preview"

/**
 * Single adaptive surface for ALL imports — file and email, live and
 * historical. Derives everything it renders from the provider's `openLogId`:
 * the live log row (subscription), the in-memory context (for live status),
 * and the email preview (for email sources).
 */
export function ImportSurface() {
  const { openLogId, openContext: ctx, closeSheet } = useImportService()
  const strata = useStrata()

  const [log, setLog] = useState<(ImportLog & BaseEntity) | null>(null)
  const [liveStatus, setLiveStatus] = useState<ContextStatus | null>(null)

  // Subscribe to the active log row so status/counts update live.
  useEffect(() => {
    if (!strata || !openLogId) return
    const sub = strata.repo(importLogEntity).observe(openLogId).subscribe((row) => {
      setLog(row ?? null)
    })
    return () => { sub.unsubscribe() }
  }, [strata, openLogId])

  useEffect(() => {
    if (!ctx) return
    const sub = ctx.observeStatus().subscribe(setLiveStatus)
    return () => { sub.unsubscribe() }
  }, [ctx])

  const { email, loading: emailLoading } = useEmailPreview(openLogId ? log : null)

  if (!openLogId || !log) {
    return (
      <AdaptiveSurface
        open={false}
        onOpenChange={() => { closeSheet() }}
        title="Import"
        content={null}
        desktop={{ type: "dialog" }}
        mobile={{ type: "sheet", props: { side: "bottom" } }}
      />
    )
  }

  // Live status wins only when a live context exists; else use the log status.
  const status: ContextStatus = ctx ? (liveStatus ?? log.status) : log.status
  const prompt = ctx?.prompt ?? null
  const isInProgress = status === "in_progress" || status === "pending"
  const isTerminal = status === "completed" || status === "failed" || status === "cancelled"

  return (
    <AdaptiveSurface
      open
      onOpenChange={(open) => { if (!open) closeSheet() }}
      title="Import"
      content={
        <div className="flex w-full min-w-0 flex-col gap-4">
          <Header log={log} email={email} emailLoading={emailLoading} />
          <StatusLine status={status} log={log} ctxError={ctx?.error} />
          <DetailBlock log={log} />

          {prompt?.kind === "password" && (
            <PasswordPrompt onSubmit={(pw) => { ctx?.answer({ kind: "password", password: pw }) }} />
          )}
          {prompt?.kind === "account-selection" && (
            <AccountSelectionPrompt
              accountIds={prompt.accountIds}
              onSelect={(id) => { ctx?.answer({ kind: "account-selection", accountId: id }) }}
            />
          )}
          {prompt?.kind === "confirm" && (
            <ConfirmPrompt
              parsed={prompt.parsed}
              newCount={prompt.newCount}
              duplicate={prompt.duplicate}
              onConfirm={() => { ctx?.answer({ kind: "confirm", confirmed: true }) }}
              onCancel={() => { ctx?.answer({ kind: "confirm", confirmed: false }) }}
            />
          )}

          <div className="mt-2 flex justify-end gap-2">
            {isInProgress && !prompt && (
              <Button variant="outline" onClick={() => { ctx?.cancel() }}>Cancel</Button>
            )}
            {(isTerminal || prompt) && (
              <Button variant="outline" onClick={closeSheet}>Close</Button>
            )}
          </div>
        </div>
      }
      desktop={{ type: "dialog", props: { className: "w-full sm:max-w-md" } }}
      mobile={{ type: "sheet", props: { side: "bottom" } }}
    />
  )
}

// ── Header ──────────────────────────────────────────────

function Header({ log, email, emailLoading }: {
  log: ImportLog
  email: EmailPreview | null
  emailLoading: boolean
}) {
  if (log.source.kind === "file") {
    return (
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <Icon name="file-text" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{log.source.fileName}</div>
          {log.source.fileSize !== undefined && (
            <div className="text-xs text-muted-foreground">{formatBytes(log.source.fileSize)}</div>
          )}
        </div>
      </div>
    )
  }

  // email source
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <Icon name="mail" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{email?.from ?? log.source.from}</div>
          <div className="truncate text-xs text-muted-foreground">{email?.subject ?? log.source.subject}</div>
        </div>
        {email?.webLink && (
          <a href={email.webLink} target="_blank" rel="noreferrer" className="shrink-0">
            <Button variant="ghost" size="icon-sm">
              <Icon name="external-link" className="size-4" />
            </Button>
          </a>
        )}
      </div>
      {emailLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3" /> Loading email details…
        </div>
      )}
      {email && email.attachments.length > 0 && (
        <div className="flex flex-col gap-1 pl-8">
          {email.attachments.map((att) => (
            <div key={att.filename} className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name="file-text" className="size-3 shrink-0" />
              <span className="truncate">{att.filename}</span>
              <span className="shrink-0">· {formatBytes(att.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Status line ─────────────────────────────────────────

function StatusLine({ status, log, ctxError }: {
  status: ContextStatus
  log: ImportLog
  ctxError?: Error | null
}) {
  switch (status) {
    case "pending":
    case "in_progress":
      return <div className="flex items-center gap-2 text-muted-foreground"><Spinner /> Processing…</div>
    case "needs_input":
      return <div className="flex items-center gap-2 text-amber-600"><Icon name="clock" className="size-4" /> Needs your input</div>
    case "completed":
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Icon name="circle-check" className="size-4" />
          Imported {log.counts.new} new of {log.counts.parsed} transaction{log.counts.parsed !== 1 ? "s" : ""}
        </div>
      )
    case "cancelled":
      return <div className="flex items-center gap-2 text-muted-foreground"><Icon name="circle-x" className="size-4" /> Cancelled</div>
    case "failed":
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-destructive"><Icon name="circle-x" className="size-4" /> Import failed</div>
          {(ctxError?.message ?? log.error?.message) && (
            <p className="text-xs text-muted-foreground">{ctxError?.message ?? log.error?.message}</p>
          )}
        </div>
      )
  }
}

// ── Detail block ────────────────────────────────────────

function DetailBlock({ log }: { log: ImportLog }) {
  const rows: Array<{ label: string; value: string }> = []
  if (log.adapterId) rows.push({ label: "Adapter", value: log.adapterId })
  if (log.source.kind === "email" && log.source.receivedAt > 0) {
    rows.push({ label: "Email date", value: new Date(log.source.receivedAt).toLocaleString() })
  }
  if (log.counts.parsed > 0) {
    rows.push({ label: "Parsed", value: String(log.counts.parsed) })
    rows.push({ label: "New", value: String(log.counts.new) })
    rows.push({ label: "Duplicate", value: String(log.counts.duplicate) })
  }
  if (log.touchedAccountIds.length > 0) {
    rows.push({ label: "Accounts touched", value: String(log.touchedAccountIds.length) })
  }
  if (log.emailRun) {
    rows.push({ label: "Scanned range", value: formatDateRange(log.emailRun.windowStart, log.emailRun.windowEnd) })
    rows.push({ label: "Emails scanned", value: String(log.emailRun.readEmailCount) })
    rows.push({ label: "Emails imported", value: String(log.emailRun.importedEmailCount) })
  }
  rows.push({ label: "Triggered", value: new Date(log.triggeredAt).toLocaleString() })

  if (rows.length === 0) return null

  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3 text-xs">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="truncate">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Utils ───────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Compact day range, earliest first. Year shown on both ends unless they share it. */
function formatDateRange(a: number, b: number): string {
  const start = Math.min(a, b)
  const end = Math.max(a, b)
  const startDate = new Date(start)
  const endDate = new Date(end)
  const sameYear = startDate.getFullYear() === endDate.getFullYear()
  const base: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  const from = startDate.toLocaleDateString(undefined, sameYear ? base : { ...base, year: "numeric" })
  const to = endDate.toLocaleDateString(undefined, { ...base, year: "numeric" })
  return `${from} – ${to}`
}
