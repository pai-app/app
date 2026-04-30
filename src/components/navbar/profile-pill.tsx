import { useNavigate } from "react-router"
import { ArrowLeftRight, LogOut, User } from "lucide-react"
import { useAuth } from "strata-plugins-ui/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { cn } from "@/lib/utils"

type ProfilePillProps = {
  readonly className?: string
}

export function ProfilePill({ className }: ProfilePillProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "glass flex size-11 cursor-pointer items-center justify-center rounded-full p-0",
            className,
          )}
        >
          <User className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="min-w-48">
        <div className="flex justify-center px-1.5 py-1">
          <ThemeSwitcher />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void navigate("/tenants")}>
            <ArrowLeftRight className="size-4" />
            Switch household
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void logout()
          }}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
