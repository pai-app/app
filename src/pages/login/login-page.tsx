import { AuthTemplate } from "@/templates/AuthTemplate"
import { Button } from "@/ui/button"
import { AuthService } from "@/services/core/AuthService"

export function LoginPage() {
  return (
    <AuthTemplate>
      <div className="flex w-full flex-col gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => AuthService.login("google")}
        >
          Continue with Google
        </Button>
      </div>
    </AuthTemplate>
  )
}
