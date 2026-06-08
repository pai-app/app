import { useEffect, useState } from "react"
import { useStrata } from "@strata/plugins-ui"
import type { BaseEntity } from "@strata/core"
import { AdaptiveSurface } from "@/components/adaptive-surface"
import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { Spinner } from "@/ui/spinner"
import { Progress } from "@/ui/progress"
import { useApp } from "@/providers/app-provider"
import { useEntity } from "@/providers/entity-provider"
import { useImportService } from "@/providers/import-provider"
import { useEmailPreview } from "@/components/import/use-email-preview"
import { PasswordPrompt, AccountSelectionPrompt, ConfirmPrompt } from "@/components/import/import-prompts"
import type { ContextStatus } from "@/services/import/import-context"
import { importLogEntity, sweepProgress, type ImportLog } from "@/services/entities/import-log"
import {
  importSourceEntity,
  importSourceMonthKey,
  type ImportSource,
} from "@/services/entities/import-source"
import type { EmailPreview } from "@/services/email-types"
import { cn } from "@/lib/utils"

/**
 * Single adaptive surface for ALL imports — file and email, live and
 * historical. Derives everything it renders from the provider's `openLogId`:
 * the live log row (subscription), the in-memory context (for live status),
 * and the email preview (for email sources).
 */
export function ImportSurface() {
  const { openLogId, openContext: ctx, closeSheet } = useImportService()
  const { isMobile } = useApp()
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
        <div className={cn("flex w-full min-w-0 flex-col gap-4", isMobile && "px-4 pb-4")}>
          <Header log={log} email={email} emailLoading={emailLoading} />
          <StatusLine status={status} log={log} ctxError={ctx?.error} />
          {log.emailRun && <SweepProgress log={log} live={isInProgress} />}
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
  //
  // A sweep covers the whole mailbox — there is no single email to preview
  // until a specific message demands attention (e.g. a password prompt sets
  // `source.emailId`). Until then, show a mailbox summary, not a faux
  // single-email card built from the account address + blank subject.
  if (!log.source.emailId) {
    return (
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <Icon name="mailbox" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{log.source.from}</div>
          <div className="text-xs text-muted-foreground">Mailbox sync</div>
        </div>
      </div>
    )
  }

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

// ── Sweep progress ──────────────────────────────────────

/**
 * Subscribe to the `importSource` rows for a run. Scoped to the partition(s)
 * the sources live in (the run's month, plus the current month so a long
 * sweep that crosses a month boundary still resolves).
 */
function useImportSources(log: ImportLog & BaseEntity): readonly (ImportSource & BaseEntity)[] {
  const strata = useStrata()
  const [sources, setSources] = useState<readonly (ImportSource & BaseEntity)[]>([])

  useEffect(() => {
    if (!strata) return
    // Sources live in the run's month, plus the current month so a long sweep
    // that crosses a month boundary still resolves.
    const keys = [...new Set([importSourceMonthKey(log.triggeredAt), importSourceMonthKey(Date.now())])]
    const sub = strata
      .repo(importSourceEntity)
      .observeQuery({ keys, where: { importLogId: log.id } })
      .subscribe(setSources)
    return () => { sub.unsubscribe() }
  }, [strata, log.id, log.triggeredAt])

  return sources
}

/**
 * Live time-progress for an email sweep. The cursor walks newest → oldest, so
 * the bar fills as the run reaches back in time. Incremental runs with a known
 * floor show an exact date-based bar; the first full backfill (or a run past a
 * corrupt high-water mark) shows an estimated fill driven by the scan count.
 *
 * The per-account breakdown is derived live from the run's `importSource`
 * rows, not stored on the log.
 */
function SweepProgress({ log, live }: { log: ImportLog & BaseEntity; live: boolean }) {
  const { accounts } = useEntity()
  const sources = useImportSources(log)
  const run = log.emailRun
  if (!run) return null

  const { cursorAt, scanned, imported, currentFrom } = run
  const { value, estimated } = sweepProgress(run, live)
  const reached = formatMonthYear(cursorAt)
  const label = estimated && live ? `Rewinding through ${reached}…` : `Reached ${reached}`

  // Roll the source rows up per account for a compact, bounded breakdown.
  const byAccount = new Map<string, number>()
  for (const s of sources) {
    if (!s.accountId) continue
    byAccount.set(s.accountId, (byAccount.get(s.accountId) ?? 0) + s.counts.new)
  }
  const rollup = [...byAccount].sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{imported} / {scanned}</span>
      </div>
      <Progress value={value * 100} />
      {live && currentFrom && (
        <div className="truncate text-xs text-muted-foreground">Now: {currentFrom}</div>
      )}
      {rollup.length > 0 && (
        <div className="flex flex-col gap-0.5 pt-1">
          {rollup.map(([accountId, newCount]) => {
            const name = accounts.find((x) => x.id === accountId)?.name ?? accountId
            return (
              <div key={accountId} className="flex justify-between gap-4 text-xs">
                <span className="truncate text-muted-foreground">{name}</span>
                <span className="shrink-0 tabular-nums">+{newCount}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
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
  if (!log.emailRun && log.touchedAccountIds.length > 0) {
    rows.push({ label: "Accounts touched", value: String(log.touchedAccountIds.length) })
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

/** Month + year, e.g. "Mar 2023". */
function formatMonthYear(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", year: "numeric" })
}
