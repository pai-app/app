import { useState } from "react"
import { useAuthActions, useStatus } from "@fyre-db/plugins-ui"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Card } from "@/ui/card"
import { Text } from "@/ui/text"

/**
 * Rendered when the active household is encrypted and needs a password
 * (`status === 'unlocking'`). Calls `unlock()` on the FyreDbApp, which retries
 * the open with the credential.
 */
export function UnlockDialog() {
  const { unlock } = useAuthActions()
  const status = useStatus()
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!password) {
      setError("Password is required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await unlock(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card size="default" className="w-full max-w-sm gap-4 p-6">
        <div className="flex flex-col gap-1">
          <Text variant="label" size="lg">Unlock household</Text>
          <Text variant="muted" size="sm">
            Enter the password used when this household was created.
          </Text>
        </div>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <Input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null) }}
            placeholder="Password"
            autoComplete="current-password"
            autoFocus
          />
          {error && (
            <Text variant="muted" size="sm" className="text-destructive">{error}</Text>
          )}
          <Button type="submit" disabled={!password || busy || status === "opening"}>
            {busy ? "Unlocking…" : "Unlock"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
