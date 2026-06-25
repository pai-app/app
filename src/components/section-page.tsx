import type { ReactNode } from "react"
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  matchPath,
  useLocation,
  useResolvedPath,
} from "react-router"
import { Icon } from "@/ui/icon"
import { OverflowBar } from "@/ui/overflow-bar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/breadcrumb"

export type Section = {
  readonly key: string
  readonly label: string
  /** `<Icon>` name. */
  readonly icon: string
  /** Relative segment, e.g. `"general"` or `"data/*"`. */
  readonly path: string
  readonly element: ReactNode
}

type SectionPageProps = {
  readonly title: string
  readonly sections: readonly Section[]
}

/** Join the section base pathname with a relative section path into a pattern. */
function fullPattern(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/${path}`
}

/**
 * Self-contained, declarative section surface shared by Settings and the dev
 * hub. Give it a `title` and `sections` (each a relative `path`, label, icon
 * and `element`); it owns the segmented nav, default selection, routing and
 * the mobile breadcrumb. Responsiveness is 100% Tailwind — no `isMobile`, no
 * breadcrumb provider. Mobile and desktop share one routing model.
 *
 * Designed to live inside the app's single global scroll container — it adds
 * no inner scrollbar; tall content scrolls behind the floating chrome.
 */
export function SectionPage({ title, sections }: SectionPageProps): ReactNode {
  const base = useResolvedPath(".")
  const { pathname } = useLocation()

  const active = sections.find((s) =>
    matchPath({ path: fullPattern(base.pathname, s.path), end: false }, pathname),
  )

  const items = sections.map((s) => ({
    key: s.key,
    active: s === active,
    element: (
      <NavLink to={s.path} className="relative z-10 flex items-center gap-1.5">
        <Icon name={s.icon} className="size-4" />
        {s.label}
      </NavLink>
    ),
  }))

  return (
    <div className="flex flex-col">
      {active && (
        <div className="px-1 pb-3 lg:hidden">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink to=".">{title}</NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{active.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      <div className="sticky top-2 z-10 flex justify-center pb-4 lg:top-20">
        <OverflowBar items={items} className="glass h-11 w-full rounded-full px-1.5 lg:w-max" />
      </div>

      <Routes>
        <Route index element={<Navigate to={sections[0]?.path ?? "."} replace />} />
        {sections.map((s) => (
          <Route key={s.key} path={s.path} element={s.element} />
        ))}
      </Routes>
    </div>
  )
}
