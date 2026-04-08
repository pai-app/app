import { AuthProvider } from "@/providers/AuthProvider"
import { AppRouter } from "./router"

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
