import type { ReactNode } from "react"
import { Logo } from "@/components/logo"
import { ThemeSwitcher } from "@/components/theme-switcher"

type LobbyTemplateProps = {
  readonly children: ReactNode
  readonly actions?: ReactNode
}

export function LobbyTemplate({ children, actions }: LobbyTemplateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {actions}
        <ThemeSwitcher />
      </div>
      <div className="flex w-full max-w-4xl flex-col items-center gap-8 px-4">
        <Logo className="h-12 w-auto" />
        {children}
      </div>
    </div>
  )
}
