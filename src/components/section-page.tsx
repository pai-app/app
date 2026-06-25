import type { ReactNode } from "react"
import { Icon } from "@/ui/icon"
import { OverflowBar } from "@/ui/overflow-bar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/breadcrumb"

export type Section = {
  readonly key: string
  /** Tab label. A plain string, or a node (e.g. a router `<Link>`). */
  readonly label: ReactNode
  /** `<Icon>` name. */
  readonly icon: string
  /** Invoked when the tab is clicked — e.g. to navigate. */
  readonly onClick?: () => void
  readonly element: ReactNode
}

type SectionPageProps = {
  readonly title: string
  readonly sections: readonly Section[]
  /** `key` of the active section. The caller derives it from the route. */
  readonly active: string
}

/**
 * Presentational section surface shared by Settings and the dev hub. It lays
 * out the segmented nav (one tab per section), the mobile breadcrumb, and the
 * active section's content — nothing more. **Routing is the caller's concern:**
 * pass which section is `active` and an `onClick` (or a `<Link>` in `label`)
 * per section. No react-router, no `isMobile` — responsiveness is 100% Tailwind.
 *
 * Designed to live inside the app's single global scroll container — it adds
 * no inner scrollbar; tall content scrolls behind the floating chrome.
 */
export function SectionPage({ title, sections, active }: SectionPageProps): ReactNode {
  const activeSection = sections.find((s) => s.key === active)

  const items = sections.map((s) => ({
    key: s.key,
    active: s.key === active,
    element: (
      <button
        type="button"
        onClick={s.onClick}
        className="relative z-10 flex cursor-pointer items-center gap-1.5"
      >
        <Icon name={s.icon} className="size-4" />
        {s.label}
      </button>
    ),
  }))

  return (
    <div className="flex flex-col">
      {activeSection && (
        <div className="px-1 pb-3 lg:hidden">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>{title}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{activeSection.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      <div className="sticky top-2 z-10 flex justify-center pb-4 lg:top-20">
        <OverflowBar items={items} className="glass h-11 w-full rounded-full px-1.5 lg:w-max" />
      </div>

      {activeSection?.element}
    </div>
  )
}
