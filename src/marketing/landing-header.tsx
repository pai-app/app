import { Link } from "react-router"
import { Icon } from "@/ui/icon"
import { Button } from "@/ui/button"
import { Logo } from "@/components/logo"
import { ThemeSwitcher } from "@/components/theme-switcher"

/** Sticky translucent top bar for the public landing page. */
export function LandingHeader() {
  return (
    <header className="glass sticky top-0 z-20 border-b border-glass-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Logo className="h-7 w-auto" linked />
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <div className="mx-1 h-5 w-px bg-border" />
          <Button asChild size="sm">
            <Link to="/login">
              Sign in
              <Icon name="arrow-right" className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
