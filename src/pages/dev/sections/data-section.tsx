import { Fragment, useEffect, useMemo, useState } from "react"
import { useStrata } from "@strata/plugins-ui"
import type { BaseEntity, EntityDefinition, Repository, SingletonRepository } from "@strata/core"
import { Icon } from "@/ui/icon"
import { Input } from "@/ui/input"
import { Button } from "@/ui/button"
import { Spinner } from "@/ui/spinner"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/ui/sheet"
import { cn } from "@/lib/utils"
import { useApp } from "@/providers/app-provider"
import { useEntity } from "@/providers/entity-provider"
import { ENTITIES } from "@/services/entities"

type Row = Record<string, unknown> & BaseEntity

type EntityKind = "singleton" | "global" | "partitioned"

function entityKind(name: string): EntityKind | null {
  const def = ENTITIES.find((e) => e.name === name)
  return def ? def.keyStrategy.kind : null
}

/** Fiscal year that today's date falls into, given a starting month (1..12). */
function currentFiscalYear(firstMonth: number): number {
  const today = new Date()
  const month = today.getMonth() + 1
  return month >= firstMonth ? today.getFullYear() : today.getFullYear() - 1
}

/** The twelve `YYYY-MM` partition keys for a calendar year. */
function monthKeysForYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`)
}

/**
 * Generic entity data browser. Lists all registered entities and adapts the
 * surface to each entity's key strategy:
 *  - `singleton`  → renders the single row as JSON, no table.
 *  - `global`     → table over the one `_` partition (auto-loaded).
 *  - `partitioned`→ a year stepper drives which monthly partitions load.
 * Ported from the old app's dev store page. Reads `ENTITIES` so new entities
 * appear automatically.
 */
export function DataSection() {
  const strata = useStrata()
  const { isMobile } = useApp()
  const { settings } = useEntity()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)
  const [singletonRow, setSingletonRow] = useState<Row | null>(null)
  const [rows, setRows] = useState<ReadonlyArray<Row>>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [year, setYear] = useState(() => currentFiscalYear(settings.firstMonth))

  const entityNames = useMemo(() => ENTITIES.map((e) => e.name).sort(), [])
  const kind = selectedEntity ? entityKind(selectedEntity) : null

  // Subscribe to the selected entity's rows. Partitioned entities load one
  // calendar year of monthly partitions at a time (driven by `year`).
  useEffect(() => {
    if (!strata || !selectedEntity) return
    const def = ENTITIES.find((e) => e.name === selectedEntity)
    if (!def) return

    if (def.keyStrategy.kind === "singleton") {
      const repo = strata.repo(def as EntityDefinition<Row, "singleton">) as SingletonRepository<Row>
      const sub = repo.observe().subscribe((row) => {
        setSingletonRow(row ?? null)
        setLoading(false)
      })
      return () => { sub.unsubscribe() }
    }

    const repo = strata.repo(def as EntityDefinition<Row, "global" | "partitioned">) as Repository<Row>
    const opts = def.keyStrategy.kind === "partitioned" ? { keys: monthKeysForYear(year) } : undefined
    const sub = repo.observeQuery(opts).subscribe((list) => {
      setRows(list)
      setLoading(false)
    })
    return () => { sub.unsubscribe() }
  }, [strata, selectedEntity, year])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => Object.values(r).some((v) => formatCell(v).toLowerCase().includes(q)))
  }, [rows, search])

  const selectEntity = (name: string) => {
    setSelectedEntity(name)
    setSelectedRow(null)
    setSingletonRow(null)
    setRows([])
    setSearch("")
    setYear(currentFiscalYear(settings.firstMonth))
    setLoading(true)
  }

  // ── Entity list ──────────────────────────────────────

  const entityList = (
    <div className="flex flex-col gap-1">
      {entityNames.map((name) => (
        <Button
          key={name}
          variant={selectedEntity === name ? "secondary" : "ghost"}
          size="sm"
          className="justify-start"
          onClick={() => { selectEntity(name) }}
        >
          {name}
        </Button>
      ))}
    </div>
  )

  // ── Layout ───────────────────────────────────────────

  const isPartitioned = kind === "partitioned"

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        {!selectedEntity ? (
          entityList
        ) : (
          <>
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => { setSelectedEntity(null) }}>
              ← Entities
            </Button>
            {kind === "singleton" ? (
              <SingletonView entity={selectedEntity} row={singletonRow} loading={loading} />
            ) : (
              <>
                <DetailHeader
                  entity={selectedEntity}
                  total={rows.length}
                  filtered={filteredRows.length}
                  search={search}
                  onSearch={setSearch}
                  year={isPartitioned ? year : null}
                  onYear={setYear}
                />
                <RowCards rows={filteredRows} loading={loading} onSelect={setSelectedRow} />
                <Sheet open={selectedRow !== null} onOpenChange={(open) => { if (!open) setSelectedRow(null) }}>
                  <SheetContent side="bottom" className="max-h-[80vh]">
                    <SheetHeader>
                      <SheetTitle className="truncate font-mono text-xs">{selectedRow?.id}</SheetTitle>
                    </SheetHeader>
                    <pre className="overflow-auto whitespace-pre-wrap break-all p-4 pt-0 text-xs">
                      {selectedRow ? JSON.stringify(selectedRow, null, 2) : ""}
                    </pre>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-3">
      <div className="w-44 shrink-0 overflow-auto rounded-lg border p-2">
        <h3 className="mb-2 px-2 text-sm font-semibold">Entities</h3>
        {entityList}
      </div>
      {selectedEntity && kind === "singleton" && (
        <div className="min-w-0 flex-1 overflow-auto rounded-lg border">
          <SingletonView entity={selectedEntity} row={singletonRow} loading={loading} />
        </div>
      )}
      {selectedEntity && kind !== "singleton" && (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
          <DetailHeader
            entity={selectedEntity}
            total={rows.length}
            filtered={filteredRows.length}
            search={search}
            onSearch={setSearch}
            year={isPartitioned ? year : null}
            onYear={setYear}
          />
          <div className="min-h-0 flex-1 overflow-auto">
            <RowTable rows={filteredRows} loading={loading} selectedId={selectedRow?.id ?? null} onSelect={setSelectedRow} />
          </div>
        </div>
      )}
      {selectedRow && kind !== "singleton" && (
        <div className="w-1/3 shrink-0 overflow-auto rounded-lg border">
          <JsonPanel row={selectedRow} onClose={() => { setSelectedRow(null) }} />
        </div>
      )}
    </div>
  )
}

// ── Detail header (count + search + year) ───────────────

function DetailHeader({ entity, total, filtered, search, onSearch, year, onYear }: {
  entity: string
  total: number
  filtered: number
  search: string
  onSearch: (q: string) => void
  year: number | null
  onYear: (y: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b bg-background p-2">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-sm font-medium">{entity}</div>
          <div className="text-xs text-muted-foreground">
            {filtered !== total && `${filtered} / `}{total} items
          </div>
        </div>
        {year !== null && (
          <div className="flex items-center gap-1 rounded-md border px-1">
            <Button variant="ghost" size="icon-sm" onClick={() => { onYear(year - 1) }} aria-label="Previous year">
              <Icon name="chevron-left" className="size-4" />
            </Button>
            <span className="min-w-12 text-center text-sm tabular-nums">{year}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => { onYear(year + 1) }} aria-label="Next year">
              <Icon name="chevron-right" className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <Input
        value={search}
        onChange={(e) => { onSearch(e.target.value) }}
        placeholder="Search…"
        className="h-8 w-40"
      />
    </div>
  )
}

// ── Singleton view (JSON only) ──────────────────────────

function SingletonView({ entity, row, loading }: {
  entity: string
  row: Row | null
  loading: boolean
}) {
  if (loading) {
    return <div className="flex h-32 items-center justify-center"><Spinner /></div>
  }
  return (
    <div className="p-2">
      <div className="mb-2 text-sm font-medium">{entity}</div>
      {row ? (
        <pre className="overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(row, null, 2)}</pre>
      ) : (
        <div className="text-sm text-muted-foreground">No value set.</div>
      )}
    </div>
  )
}

// ── Row table ───────────────────────────────────────────

const FIRST_KEYS = ["id"]
const LAST_KEYS = ["createdAt", "updatedAt", "version", "device", "hlc"]

function RowTable({ rows, loading, selectedId, onSelect }: {
  rows: ReadonlyArray<Row>
  loading: boolean
  selectedId: string | null
  onSelect: (row: Row) => void
}) {
  if (loading) {
    return <div className="flex h-32 items-center justify-center"><Spinner /></div>
  }
  if (rows.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No rows.</div>
  }

  const keys = [
    ...FIRST_KEYS,
    ...Object.keys(rows[0]).filter((k) => !FIRST_KEYS.includes(k) && !LAST_KEYS.includes(k)),
    ...LAST_KEYS.filter((k) => k in rows[0]),
  ]

  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 z-10 bg-background">
        <tr className="border-b">
          {keys.map((k) => (
            <th key={k} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => { onSelect(row) }}
            className={cn(
              "cursor-pointer border-b hover:bg-muted/50",
              selectedId === row.id && "bg-muted",
            )}
          >
            {keys.map((k) => (
              <td key={k} className="max-w-60 truncate px-2 py-1.5">{formatCell((row as Record<string, unknown>)[k])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Row cards (mobile) ──────────────────────────────────

/**
 * Mobile alternative to the wide table — each row is a compact card showing a
 * handful of preview fields. Tapping a card opens the full JSON (a bottom
 * sheet driven by the parent), avoiding horizontal scroll on narrow screens.
 */
function RowCards({ rows, loading, onSelect }: {
  rows: ReadonlyArray<Row>
  loading: boolean
  onSelect: (row: Row) => void
}) {
  if (loading) {
    return <div className="flex h-32 items-center justify-center"><Spinner /></div>
  }
  if (rows.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No rows.</div>
  }

  const previewKeys = Object.keys(rows[0])
    .filter((k) => !FIRST_KEYS.includes(k) && !LAST_KEYS.includes(k))
    .slice(0, 4)

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => { onSelect(row) }}
          className="flex flex-col gap-1.5 rounded-lg border p-3 text-left active:bg-muted"
        >
          <div className="truncate font-mono text-[0.7rem] text-muted-foreground">{row.id}</div>
          <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
            {previewKeys.map((k) => (
              <Fragment key={k}>
                <dt className="truncate text-muted-foreground">{k}</dt>
                <dd className="truncate">{formatCell((row as Record<string, unknown>)[k])}</dd>
              </Fragment>
            ))}
          </dl>
        </button>
      ))}
    </div>
  )
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value.toString()
  }
  return JSON.stringify(value)
}

// ── JSON views ──────────────────────────────────────────

function JsonPanel({ row, onClose }: { row: Row; onClose: () => void }) {
  return (
    <div className="relative p-2">
      <Button variant="ghost" size="icon-sm" className="absolute right-2 top-2" onClick={onClose}>
        <Icon name="x" className="size-4" />
      </Button>
      <pre className="overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(row, null, 2)}</pre>
    </div>
  )
}
