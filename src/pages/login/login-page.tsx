import { AuthTemplate } from "@/templates/auth-template"
import { Button } from "@/ui/button"
import { authService, authProviders } from "@/services/core/auth-service"

export function LoginPage() {
  return (
    <AuthTemplate>
      <div className="flex w-full flex-col gap-3">
        {authProviders.map((provider) => (
          <Button
            key={provider.name}
            variant="outline"
            className="w-full"
            onClick={() => authService.login(provider.name)}
          >
            {provider.label}
          </Button>
        ))}
      </div>
    </AuthTemplate>
  )
}
