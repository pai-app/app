import { useEffect, useState } from "react"
import { DefaultTemplate } from "@/templates/DefaultTemplate"
import { Button } from "@/ui/button"
import { AuthService, type FeatureCreds } from "@/services/core/AuthService"

export function HomePage() {
  const [creds, setCreds] = useState<FeatureCreds | null>(null)

  useEffect(() => {
    const pending = AuthService.consumeFeatureCreds()
    if (pending) setCreds(pending)
  }, [])

  function handleSetupEmail() {
    AuthService.featureLogin("google", "email-import")
  }

  return (
    <DefaultTemplate>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome to Fin</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSetupEmail}>
            Setup Email Import
          </Button>
          <Button variant="outline" onClick={() => AuthService.logout()}>
            Logout
          </Button>
        </div>
      </div>

      {creds && (
        <pre className="mt-4 rounded-md bg-muted p-4 text-sm overflow-auto">
          {JSON.stringify(creds, null, 2)}
        </pre>
      )}
    </DefaultTemplate>
  )
}
