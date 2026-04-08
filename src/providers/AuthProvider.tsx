import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { AuthService, type AuthState } from "@/services/core/AuthService"

const AuthContext = createContext<AuthState>({ status: "loading" })

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" })

  useEffect(() => {
    const subscription = AuthService.state$.subscribe(setAuthState)
    AuthService.tryRestoreSession()
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  )
}
