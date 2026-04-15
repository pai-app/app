import { AuthTemplate } from "@/templates/auth-template"
import { Button } from "@/ui/button"
import { authService } from "@/services/core/auth-service"

export function LoginPage() {
  return (
    <AuthTemplate>
      <div className="flex w-full flex-col gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => authService.login("google")}
        >
          Continue with Google
        </Button>
      </div>
    </AuthTemplate>
  )
}
