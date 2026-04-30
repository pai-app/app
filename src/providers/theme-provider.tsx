import { createContext, useContext, useEffect, useState } from "react"
import { THEME_KEY } from "@shared/providers"

export type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  readonly children: React.ReactNode
  readonly defaultTheme?: Theme
}

type ThemeProviderState = {
  readonly theme: Theme
  readonly resolvedTheme: 'light' | 'dark'
  readonly setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    () => (localStorage.getItem(THEME_KEY) as Theme) || defaultTheme,
  )

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  )

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => { setSystemTheme(e.matches ? "dark" : "light"); }
    mql.addEventListener("change", handler)
    return () => { mql.removeEventListener("change", handler); }
  }, [])

  const resolvedTheme: 'light' | 'dark' = theme === "system" ? systemTheme : theme

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const value: ThemeProviderState = {
    theme,
    resolvedTheme,
    setTheme: (t: Theme) => {
      localStorage.setItem(THEME_KEY, t)
      setTheme(t)
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeProviderContext)
}
