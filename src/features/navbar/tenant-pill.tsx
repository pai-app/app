import { useNavigate, useParams } from "react-router"
import { Icon } from "@/ui/icon"
import { useTenant } from "@fyre-db/plugins-ui"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type TenantPillProps = {
  readonly className?: string
  readonly variant?: "default" | "compact"
}

export function TenantPill({ className, variant = "default" }: TenantPillProps) {
  const navigate = useNavigate()
  const { tenantId } = useParams()
  const { all, active } = useTenant()

  const current = active ?? all.find((t) => t.id === tenantId)

  const switchTenant = (id: string) => {
    if (!id || id === tenantId) return
    void navigate(`/t/${id}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch household"
          className={cn(
            "glass flex h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-sm",
            className,
          )}
        >
          <Icon name="home" className="size-4" />
          {variant === "default" && (
            <span className="max-w-[10rem] truncate">
              {current?.name ?? "No household"}
            </span>
          )}
          <Icon name="chevron-down" className="size-4 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={10}>
        {all.map((t) => (
          <DropdownMenuCheckboxItem
            key={t.id}
            checked={current?.id === t.id}
            onClick={() => { switchTenant(t.id); }}
          >
            {t.name}
          </DropdownMenuCheckboxItem>
        ))}
        {all.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => void navigate("/tenants")}>
          <Icon name="bolt" className="size-4" />
          Manage
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
