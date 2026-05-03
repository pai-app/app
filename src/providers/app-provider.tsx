import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { StrataConfigError } from '@strata/core'

const MOBILE_BREAKPOINT = 768

type AppContextValue = {
  readonly isMobile: boolean
  readonly scrollElementRef: RefObject<HTMLDivElement | null>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

type AppProviderProps = {
  readonly children: ReactNode
  readonly scrollElementRef?: RefObject<HTMLDivElement | null>
}

export function AppProvider({ children, scrollElementRef: externalRef }: AppProviderProps) {
  const internalRef = useRef<HTMLDivElement | null>(null)
  const scrollElementRef = externalRef ?? internalRef

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => { setIsMobile(e.matches); }
    mql.addEventListener("change", handler)
    return () => { mql.removeEventListener("change", handler); }
  }, [])

  return (
    <AppContext.Provider value={{ isMobile, scrollElementRef }}>{children}</AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new StrataConfigError("useApp must be used within an AppProvider")
  return ctx
}
