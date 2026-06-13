import { NavLink, Navigate, Outlet, useLocation } from "react-router"
import { Icon } from "@/ui/icon"
import { OverflowBar } from "@/ui/overflow-bar"
import { cn } from "@/lib/utils"
import { useApp } from "@/providers/app-provider"
import { useRegisterCrumbs } from "@/providers/breadcrumb-provider"

export type NavSection = {
  readonly key: string
  readonly label: string
  readonly icon: string
  /** Absolute path the section navigates to. */
  readonly to: string
}

/**
 * Navigation style:
 * - `list` — drill-down: the base path shows a glass list of sections; the
 *   active section contributes to the shared breadcrumb bar (rendered by the
 *   `BreadcrumbProvider`) and just renders its content.
 * - `pill` — a floating glass segmented pill of all sections, always pinned.
 */
export type SectionNav = "list" | "pill"

type SectionShellProps = {
  readonly title: string
  readonly sections: ReadonlyArray<NavSection>
  /**
   * Navigation style, applied uniformly. The caller decides — it may be
   * responsive (e.g. `isMobile ? "list" : "pill"`) or fixed (e.g. always
   * `"list"` for a nested inner shell).
   */
  readonly nav: SectionNav
  /**
   * Sticky offset class for the pill chrome. Defaults to the app chrome
   * offset; override when nesting pill shells so the inner pill clears the
   * outer (e.g. `"top-32"`).
   */
  readonly stickyTop?: string
}

/** Shared parent path of the sections (the path one level above each `to`). */
function basePathOf(sections: ReadonlyArray<NavSection>): string {
  return sections[0]?.to.replace(/\/[^/]+$/, "") ?? ""
}

/**
 * Section shell shared by Settings, the dev hub, and nestable inner browsers.
 * Designed to live inside the app's single global scroll container — it adds
 * no inner scrollbar; tall content scrolls behind the floating chrome.
 *
 * The router has no index redirect; this component owns default selection
 * (`pill` lands on the first section; `list` lands on the section list).
 */
export function SectionShell({ title, sections, nav, stickyTop }: SectionShellProps) {
  const { isMobile } = useApp()
  const { pathname } = useLocation()

  const basePath = basePathOf(sections)
  const active = sections.find(
    (s) => pathname === s.to || pathname.startsWith(`${s.to}/`),
  )
  const sticky = stickyTop ?? (isMobile ? "top-2" : "top-20")

  // In list mode, contribute this shell's trail to the shared breadcrumb bar:
  // its own title (→ section list) plus the active section. Dedupe across
  // nested shells happens in the provider, so a child whose title equals its
  // parent's active label collapses to a single crumb.
  useRegisterCrumbs(
    nav === "list" && active
      ? [{ label: title, to: basePath }, { label: active.label, to: active.to }]
      : null,
  )

  // ── Pill nav ─────────────────────────────────────────
  if (nav === "pill") {
    if (!active) {
      return <Navigate to={sections[0]?.to ?? basePath} replace />
    }

    const items = sections.map((s) => ({
      key: s.key,
      active: s === active,
      element: (
        <NavLink to={s.to} className="relative z-10 flex items-center gap-1.5">
          <Icon name={s.icon} className="size-4" />
          {s.label}
        </NavLink>
      ),
    }))

    return (
      <div className="flex flex-col">
        <div className={cn("sticky z-10 flex justify-start pb-4", sticky)}>
          <OverflowBar items={items} fit className="glass h-11 w-max rounded-full px-1.5" />
        </div>
        <Outlet />
      </div>
    )
  }

  // ── List nav: section list (no active) ───────────────
  if (!active) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h2 className="px-1 text-lg font-semibold">{title}</h2>
        <ul className="glass divide-y divide-border/60 overflow-hidden rounded-2xl">
          {sections.map((s) => (
            <li key={s.key}>
              <NavLink to={s.to} className="flex items-center gap-3 px-4 py-3.5 active:bg-foreground/5">
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

  // ── List nav: active section ─────────────────────────
  // The breadcrumb bar (provider) shows the trail + back; just render content.
  return (
    <div className="p-4">
      <Outlet />
    </div>
  )
}
