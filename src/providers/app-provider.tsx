import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"
import { StrataConfigError, type Strata } from '@strata/core'
import { useStrata } from "@strata/plugins-ui"
import { registerMagicWord } from "@/lib/magic-word"

const MOBILE_BREAKPOINT = 768
const DEV_MODE_WORD = "FINDEVMODE"

/** Debug handle exposed on `window.fin` while dev mode is on. */
declare global {
  interface Window {
    fin?: { readonly strata: Strata | null }
  }
}

type AppContextValue = {
  readonly isMobile: boolean
  readonly scrollElementRef: RefObject<HTMLDivElement | null>
  /** Whether developer tools are enabled. Toggled by typing `FINDEVMODE`. */
  readonly devMode: boolean
  readonly setDevMode: (on: boolean) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

type AppProviderProps = {
  readonly children: ReactNode
  readonly scrollElementRef?: RefObject<HTMLDivElement | null>
}

export function AppProvider({ children, scrollElementRef: externalRef }: AppProviderProps) {
  const internalRef = useRef<HTMLDivElement | null>(null)
  const scrollElementRef = externalRef ?? internalRef
  const strata = useStrata()

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  )

  // Default-on for `npm run dev`, off in production. Runtime-only — resets
  // on reload. Typing `FINDEVMODE` toggles it on any page.
  const [devMode, setDevMode] = useState<boolean>(import.meta.env.DEV)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => { setIsMobile(e.matches); }
    mql.addEventListener("change", handler)
    return () => { mql.removeEventListener("change", handler); }
  }, [])

  useEffect(() => {
    return registerMagicWord(DEV_MODE_WORD, () => { setDevMode((on) => !on); })
  }, [])

  // Expose a `window.fin` debug handle (holding the active Strata instance)
  // while dev mode is on. Removed when dev mode is off or on unmount.
  useEffect(() => {
    if (!devMode) return
    window.fin = { strata }
    return () => { delete window.fin }
  }, [devMode, strata])

  const value = useMemo<AppContextValue>(
    () => ({ isMobile, scrollElementRef, devMode, setDevMode }),
    [isMobile, scrollElementRef, devMode],
  )

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new StrataConfigError("useApp must be used within an AppProvider")
  return ctx
}
