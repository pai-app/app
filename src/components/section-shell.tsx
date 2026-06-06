import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router"
import { Icon } from "@/ui/icon"
import { Button } from "@/ui/button"
import { cn } from "@/lib/utils"
import { useApp } from "@/providers/app-provider"

export type NavSection = {
  readonly key: string
  readonly label: string
  readonly icon: string
  /** Absolute path the section navigates to. */
  readonly to: string
}

type SectionShellProps = {
  readonly title: string
  readonly sections: ReadonlyArray<NavSection>
}

/** Shared parent path of the sections (the path one level above each `to`). */
function basePathOf(sections: ReadonlyArray<NavSection>): string {
  return sections[0]?.to.replace(/\/[^/]+$/, "") ?? ""
}

/**
 * Responsive section shell shared by Settings and the developer hub.
 *
 * - Desktop: a compact top tab bar above a full-height content area.
 * - Mobile: an iOS-style drill-down — the base path shows a full-screen list
 *   of sections; tapping one slides to that section with a back button.
 *
 * The router has no index redirect; this component owns default selection
 * (desktop lands on the first section, mobile lands on the list).
 */
export function SectionShell({ title, sections }: SectionShellProps) {
  const { isMobile } = useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const basePath = basePathOf(sections)
  const active = sections.find(
    (s) => pathname === s.to || pathname.startsWith(`${s.to}/`),
  )

  // ── Mobile: drill-down ───────────────────────────────
  if (isMobile) {
    if (!active) {
      return (
        <div className="flex min-h-full flex-col">
          <h2 className="px-4 py-3 text-lg font-semibold">{title}</h2>
          <ul className="divide-y border-y">
            {sections.map((s) => (
              <li key={s.key}>
                <NavLink to={s.to} className="flex items-center gap-3 px-4 py-3.5 active:bg-muted">
                  <Icon name={s.icon} className="size-5 text-muted-foreground" />
                  <span className="flex-1 text-sm">{s.label}</span>
                  <Icon name="chevron-right" className="size-4 text-muted-foreground" />
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )
    }

    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center gap-1 border-b px-2 py-2">
          <Button variant="ghost" size="icon-sm" onClick={() => { void navigate(basePath) }} aria-label="Back">
            <Icon name="chevron-left" className="size-5" />
          </Button>
          <h2 className="text-base font-semibold">{active.label}</h2>
        </header>
        <div className="min-h-0 flex-1 p-4">
          <Outlet />
        </div>
      </div>
    )
  }

  // ── Desktop: top tabs ────────────────────────────────
  if (!active) {
    return <Navigate to={sections[0]?.to ?? basePath} replace />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-6 border-b px-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <nav className="flex gap-1">
          {sections.map((s) => (
            <NavLink
              key={s.key}
              to={s.to}
              className={({ isActive }) =>
                cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Icon name={s.icon} className="size-4" />
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pt-4">
        <Outlet />
      </div>
    </div>
  )
}
