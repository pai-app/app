import type { ReactNode } from "react"

export function DefaultTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
