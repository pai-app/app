import { useState } from "react"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"

/** Prompt subcomponents shared by the import surface (file + email flows). */

export function PasswordPrompt({ onSubmit }: { onSubmit: (password: string) => void }) {
  const [value, setValue] = useState("")

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Password required</p>
      <p className="text-xs text-muted-foreground">This file is password-protected. Enter the password to continue.</p>
      <Input
        type="password"
        placeholder="Enter file password…"
        value={value}
        onChange={(e) => { setValue(e.target.value) }}
        onKeyDown={(e) => { if (e.key === "Enter" && value) onSubmit(value) }}
        autoFocus
      />
      <Button disabled={!value} onClick={() => { onSubmit(value) }}>Unlock &amp; Import</Button>
    </div>
  )
}

export function AccountSelectionPrompt({
  accountIds,
  onSelect,
}: {
  accountIds: ReadonlyArray<string>
  onSelect: (accountId: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Multiple accounts match</p>
      <p className="text-xs text-muted-foreground">Choose which account to import into:</p>
      <div className="flex flex-col gap-2">
        {accountIds.map((id) => (
          <Button key={id} variant="outline" className="justify-start truncate" onClick={() => { onSelect(id) }}>
            {id}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function ConfirmPrompt({
  parsed,
  newCount,
  duplicate,
  onConfirm,
  onCancel,
}: {
  parsed: number
  newCount: number
  duplicate: number
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Ready to import</p>
      <div className="rounded-lg border p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Transactions found</span>
          <span>{parsed}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">New</span>
          <span className="text-green-600">{newCount}</span>
        </div>
        {duplicate > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Already imported</span>
            <span className="text-amber-600">{duplicate}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" disabled={newCount === 0} onClick={onConfirm}>
          Import {newCount} transaction{newCount !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  )
}
