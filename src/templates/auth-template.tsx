import type { ReactNode } from "react"
import { Logo } from "@/components/logo"

export function LobbyTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 px-4">
        <Logo className="h-10 w-auto" />
        {children}
      </div>
    </div>
  )
}
