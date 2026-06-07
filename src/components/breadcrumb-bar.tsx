import { NavLink, useNavigate } from "react-router"
import { Icon } from "@/ui/icon"
import { cn } from "@/lib/utils"
import { useApp } from "@/providers/app-provider"
import { useCrumbs } from "@/providers/breadcrumb-provider"

/**
 * The pinned glass breadcrumb bar. Consumes the trail from
 * `BreadcrumbProvider` and renders a back button plus clickable crumbs
 * (`‹ A › B › C`). Renders nothing when the trail is empty. Sticks just below
 * the app navbar so content scrolls behind it.
 */
export function BreadcrumbBar() {
  const { isMobile } = useApp()
  const navigate = useNavigate()
  const crumbs = useCrumbs()

  if (crumbs.length === 0) return null

  const sticky = isMobile ? "top-2" : "top-20"
  const upTo = crumbs.length > 1 ? crumbs[crumbs.length - 2].to : crumbs[0].to

  return (
    <div className={cn("sticky z-10 flex px-4 pb-4", sticky)}>
      <nav className="glass flex items-center gap-1 rounded-full py-1.5 pl-2 pr-4 text-sm">
        <button
          type="button"
          aria-label="Back"
          onClick={() => { void navigate(upTo) }}
          className="flex size-6 items-center justify-center rounded-full hover:bg-foreground/5"
        >
          <Icon name="chevron-left" className="size-5" />
        </button>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <span key={c.to} className="flex items-center gap-1">
              {i > 0 && <Icon name="chevron-right" className="size-3.5 text-muted-foreground" />}
              {last ? (
                <span className="font-medium">{c.label}</span>
              ) : (
                <NavLink to={c.to} className="text-muted-foreground hover:text-foreground">
                  {c.label}
                </NavLink>
              )}
            </span>
          )
        })}
      </nav>
    </div>
  )
}
