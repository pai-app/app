import { MoneyAccountIcon } from "@/ui/money-account-icon"
import { cn } from "@/lib/utils"
import { useObservable } from "@/lib/use-observable"
import { useServices } from "@/providers/services-provider"
import type { TransactionCellProps } from "./types"

/**
 * Account marker for a transaction row — the account icon plus a masked
 * number. The richer popover lands in the editing workstream.
 */
export function AccountCell({ tx, className }: TransactionCellProps) {
  const accounts = useObservable(useServices().accounts.accounts$)
  const account = accounts.find((a) => a.id === tx.accountId)
  if (!account) return null

  const masked = account.maskedNumber

  return (
    <div className={cn("flex flex-row items-center gap-2", className)}>
      <MoneyAccountIcon account={account} className="size-5 text-muted-foreground" />
      {masked && <span className="text-sm font-light text-muted-foreground">{masked}</span>}
    </div>
  )
}
