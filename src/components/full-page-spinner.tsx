import { Spinner } from "@/ui/spinner"

export function FullPageSpinner({ message }: { readonly message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Spinner className="size-6" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
