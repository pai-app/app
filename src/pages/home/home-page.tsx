import { DefaultTemplate } from "@/templates/default-template"
import { Button } from "@/ui/button"
import { useAuth } from "strata-plugins-ui/react"

export function HomePage() {
  const { logout } = useAuth()

  return (
    <DefaultTemplate>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome to Fin</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>
    </DefaultTemplate>
  )
}