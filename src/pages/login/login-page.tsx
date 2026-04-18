import { useAuth, useProviders } from "strata-adapters/react"
import { AuthTemplate } from "@/templates/auth-template"
import { Button } from "@/ui/button"

const PROVIDER_LABELS: Record<string, string> = {
  google: "Continue with Google",
}

export function LoginPage() {
  const providers = useProviders()
  const { state, login } = useAuth()
  const busy = state.status === "loading"

  return (
    <AuthTemplate>
      <div className="flex w-full flex-col gap-3">
        {providers.map((p) => (
          <Button
            key={p.name}
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => login(p.name)}
          >
            {PROVIDER_LABELS[p.name] ?? `Continue with ${p.label}`}
          </Button>
        ))}
      </div>
    </AuthTemplate>
  )
}
