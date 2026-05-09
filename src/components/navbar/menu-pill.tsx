import { NavLink, useParams, useLocation } from "react-router"
import { Icon } from "@/ui/icon"
import { cn } from "@/lib/utils"
import { OverflowBar } from "@/ui/overflow-bar"

type MenuItem = {
  readonly key: string
  readonly label: string
  readonly path: string
  readonly iconName: string
}

const MENU: readonly MenuItem[] = [
  { key: "home", label: "Home", path: "", iconName: "home" },
]

type MenuPillProps = {
  readonly className?: string
  readonly variant?: "default" | "compact"
}

export function MenuPill({ className, variant = "default" }: MenuPillProps) {
  const { tenantId } = useParams()
  const location = useLocation()
  if (!tenantId) return null

  const basePath = `/t/${tenantId}`

  const items = MENU.map((item) => {
    const to = item.path ? `${basePath}/${item.path}` : basePath
    const isActive = item.path
      ? location.pathname.startsWith(`${basePath}/${item.path}`)
      : location.pathname === basePath

    return {
      key: item.key,
      active: isActive,
      element: (
        <NavLink to={to} end={!item.path}>
          {variant === "compact" ? (
            <Icon name={item.iconName} className="size-4" />
          ) : (
            <span className="relative z-10">{item.label}</span>
          )}
        </NavLink>
      ),
    }
  })

  return (
    <OverflowBar
      items={items}
      className={cn("glass h-11 min-w-0 shrink rounded-full px-1.5", className)}
    />
  )
}
