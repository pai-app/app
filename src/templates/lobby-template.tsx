import type { ReactNode } from "react"
import { LogOut } from "lucide-react"
import { useAuth } from "strata-plugins-ui/react"
import { Logo } from "@/components/logo"
import { Button } from "@/ui/button"
import { ThemeSwitcher } from "@/components/theme-switcher"

export function LobbyTemplate({ children }: { readonly children: ReactNode }) {
  const { status, logout } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeSwitcher />
        {status === "signed-in" && (
          <>
            <div className="mx-1 h-5 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <div className="flex w-full max-w-4xl flex-col items-center gap-6 px-4">
        <Logo className="h-12 w-auto" />
        {children}
      </div>
    </div>
  )
}
