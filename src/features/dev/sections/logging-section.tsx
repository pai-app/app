import { useState } from "react"
import {
  LOG_NAMESPACES,
  applyLogNamespaces,
  applyLogPattern,
  getLogPattern,
  isNamespaceEnabled,
} from "@/lib/log"
import { Button } from "@/ui/button"
import { Toggle } from "@/ui/toggle"
import { Input } from "@/ui/input"

const ALL_NAMESPACES = LOG_NAMESPACES.flatMap((g) => g.namespaces)

function readEnabled(): ReadonlySet<string> {
  return new Set(ALL_NAMESPACES.filter((ns) => isNamespaceEnabled(ns)))
}

/**
 * Dev logging controls. Toggles map onto the `debug` library: each enables a
 * base namespace plus its `:warn`/`:error` children. Changes take effect
 * immediately and persist via `localStorage.debug`.
 */
export function LoggingSection() {
  const [enabled, setEnabled] = useState<ReadonlySet<string>>(readEnabled)
  const [pattern, setPattern] = useState(getLogPattern)

  function commit(next: ReadonlySet<string>) {
    applyLogNamespaces([...next])
    setEnabled(next)
    setPattern(getLogPattern())
  }

  function toggle(ns: string) {
    const next = new Set(enabled)
    if (next.has(ns)) next.delete(ns)
    else next.add(ns)
    commit(next)
  }

  function applyRaw() {
    applyLogPattern(pattern)
    setEnabled(readEnabled())
    setPattern(getLogPattern())
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Toggle debug namespaces. Changes apply immediately and survive reload.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { commit(new Set(ALL_NAMESPACES)) }}>
          Everything
        </Button>
        {LOG_NAMESPACES.map((g) => (
          <Button
            key={g.group}
            variant="outline"
            size="sm"
            onClick={() => { commit(new Set(g.namespaces)) }}
          >
            {g.group} only
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={() => { commit(new Set()) }}>
          Off
        </Button>
      </div>

      {LOG_NAMESPACES.map((g) => (
        <div key={g.group} className="flex flex-col gap-2">
          <div className="text-xs font-medium uppercase text-muted-foreground">{g.group}</div>
          <div className="flex flex-wrap gap-1.5">
            {g.namespaces.map((ns) => (
              <Toggle
                key={ns}
                variant="outline"
                size="sm"
                pressed={enabled.has(ns)}
                onPressedChange={() => { toggle(ns) }}
              >
                {ns}
              </Toggle>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium uppercase text-muted-foreground">Raw pattern</div>
        <div className="flex gap-2">
          <Input
            value={pattern}
            onChange={(e) => { setPattern(e.target.value) }}
            onKeyDown={(e) => { if (e.key === "Enter") applyRaw() }}
            placeholder="e.g. pai:*,core:repo*,-core:sync*"
            className="h-8 font-mono text-xs"
          />
          <Button size="sm" onClick={applyRaw}>Apply</Button>
        </div>
      </div>
    </div>
  )
}
