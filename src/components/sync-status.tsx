import { useEffect, useState } from "react"
import { CircleDashed, CloudCheck, RefreshCw } from "lucide-react"
import { useStrata } from "strata-plugins-ui/react"
import { cn } from "@/lib/utils"

type SyncStatusProps = {
  readonly className?: string
}

export function SyncStatus({ className }: SyncStatusProps) {
  const strata = useStrata()
  const [dirty, setDirty] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!strata) return
    const dirtySub = strata.observe("dirty").subscribe(setDirty)
    const syncSub = strata.observe("sync").subscribe((evt) => {
      if (evt.type === "sync-started") setSyncing(true)
      else setSyncing(false)
    })
    return () => {
      dirtySub.unsubscribe()
      syncSub.unsubscribe()
    }
  }, [strata])

  if (!strata) return null

  const label = syncing ? "Syncing…" : dirty ? "Unsaved changes" : "All changes synced"

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center p-1 text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      aria-label={label}
      title={label}
    >
      {syncing ? <RefreshCw className="animate-spin" /> : dirty ? <CircleDashed /> : <CloudCheck />}
    </span>
  )
}
