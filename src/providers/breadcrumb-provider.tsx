import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Crumb = {
  readonly label: string
  /** Absolute path this crumb navigates to. Also dedupes/orders the trail. */
  readonly to: string
}

type Registry = {
  readonly setCrumbs: (id: string, crumbs: readonly Crumb[]) => void
  readonly clear: (id: string) => void
}

const RegistryCtx = createContext<Registry | undefined>(undefined)
const CrumbsCtx = createContext<readonly Crumb[]>([])

/** Number of path segments — deeper paths sort later in the trail. */
function depthOf(path: string): number {
  return path.split("/").filter(Boolean).length
}

/**
 * Holds the breadcrumb trail contributed by nested `SectionShell`s. Pure state
 * — renders no UI. Each contributor registers its segments via
 * `useRegisterCrumbs`; the provider dedupes by `to` (so a child's title and
 * its parent's active crumb collapse into one) and orders by path depth. A
 * consumer (`<BreadcrumbBar/>`) reads the result via `useCrumbs`.
 */
export function BreadcrumbProvider({ children }: { readonly children: ReactNode }) {
  const [groups, setGroups] = useState<ReadonlyMap<string, readonly Crumb[]>>(new Map())

  const setCrumbs = useCallback((id: string, crumbs: readonly Crumb[]) => {
    setGroups((prev) => {
      const next = new Map(prev)
      next.set(id, crumbs)
      return next
    })
  }, [])

  const clear = useCallback((id: string) => {
    setGroups((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const crumbs = useMemo(() => {
    const byTo = new Map<string, Crumb>()
    for (const list of groups.values()) {
      for (const c of list) byTo.set(c.to, c)
    }
    return [...byTo.values()].sort((a, b) => depthOf(a.to) - depthOf(b.to))
  }, [groups])

  const registry = useMemo(() => ({ setCrumbs, clear }), [setCrumbs, clear])

  return (
    <RegistryCtx.Provider value={registry}>
      <CrumbsCtx.Provider value={crumbs}>{children}</CrumbsCtx.Provider>
    </RegistryCtx.Provider>
  )
}

/** The current, deduped + ordered breadcrumb trail. Empty when none. */
export function useCrumbs(): readonly Crumb[] {
  return useContext(CrumbsCtx)
}

/**
 * Register this component's breadcrumb segments into the shared trail. Pass
 * `null` to contribute nothing (e.g. a shell at its section list, or a
 * pill-mode shell). Crumbs are serialized for the effect dependency so a fresh
 * array each render doesn't thrash registration.
 */
export function useRegisterCrumbs(crumbs: readonly Crumb[] | null): void {
  const registry = useContext(RegistryCtx)
  const id = useId()
  const serialized = crumbs && crumbs.length > 0 ? JSON.stringify(crumbs) : ""

  useEffect(() => {
    if (!registry) return
    if (serialized) registry.setCrumbs(id, JSON.parse(serialized) as Crumb[])
    else registry.clear(id)
    return () => { registry.clear(id) }
  }, [registry, id, serialized])
}
