import type { ReactNode } from "react"

export function AuthTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 px-4">
        <h1 className="text-4xl font-bold tracking-tight">fin</h1>
        {children}
      </div>
    </div>
  )
}
