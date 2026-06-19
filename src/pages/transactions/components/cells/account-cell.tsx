import { MoneyAccountIcon } from "@/ui/money-account-icon"
import { cn } from "@/lib/utils"
import { useEntity } from "@/providers/entity-provider"
import type { MoneyAccount } from "@/services/entities"
import type { TransactionCellProps } from "./types"

/** Last-4 mask of an account's stored number, when available. */
function maskAccountNumber(metadata: MoneyAccount["metadata"]): string | undefined {
  // metadata values may not exist for the "accountNumber" key at runtime
  // even though the type is Record<string, readonly string[]>
  const numbers = metadata["accountNumber"] as readonly string[] | undefined
  const first = numbers?.[0]
  if (!first || first.length < 4) return undefined
  return `****${first.slice(-4)}`
}

/**
 * Account marker for a transaction row — the account icon plus a masked
 * number. The richer popover lands in the editing workstream.
 */
export function AccountCell({ tx, className }: TransactionCellProps) {
  const { accounts } = useEntity()
  const account = accounts.find((a) => a.id === tx.accountId)
  if (!account) return null

  const masked = maskAccountNumber(account.metadata)

  return (
    <div className={cn("flex flex-row items-center gap-2", className)}>
      <MoneyAccountIcon account={account} className="size-5 text-muted-foreground" />
      {masked && <span className="text-sm font-light text-muted-foreground">{masked}</span>}
    </div>
  )
}
