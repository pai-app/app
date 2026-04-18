import { useLogin } from "strata-adapters/react"
import { AuthTemplate } from "@/templates/auth-template"
import { Button } from "@/ui/button"
import { GOOGLE_PROVIDER_NAME } from "@shared/google-oauth"

const PROVIDER_LABELS: Record<string, string> = {
  [GOOGLE_PROVIDER_NAME]: "Continue with Google",
}

export function LoginPage() {
  const { providers, login } = useLogin()

  return (
    <AuthTemplate>
      <div className="flex w-full flex-col gap-3">
        {providers.map((name) => (
          <Button
            key={name}
            variant="outline"
            className="w-full"
            onClick={() => login(name)}
          >
            {PROVIDER_LABELS[name] ?? `Continue with ${name}`}
          </Button>
        ))}
      </div>
    </AuthTemplate>
  )
}
