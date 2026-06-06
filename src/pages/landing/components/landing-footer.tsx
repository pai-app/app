import { Logo } from "@/components/logo"

/** Minimal landing footer. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Logo className="h-5 w-auto" />
          <span>· Personal finance, privately.</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <a href="/terms.html" className="transition-colors hover:text-foreground">
            Terms
          </a>
          <a href="/privacy.html" className="transition-colors hover:text-foreground">
            Privacy
          </a>
          <span>© {new Date().getFullYear()} fin. Your data stays yours.</span>
        </div>
      </div>
    </footer>
  )
}
