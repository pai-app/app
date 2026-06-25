import { MoneyAccountIcon } from "@/components/money-account-icon"
import { cn } from "@/lib/utils"
import type { AccountView } from "@/entities/account-view"

export type AccountCellProps = {
  readonly account: AccountView
  readonly className?: string
}

/**
 * Account marker for a transaction row — the account icon plus a masked
 * number. Presentational: takes an already-resolved account view; the
 * resolve-by-id wiring lives in the feature container. The richer popover
 * lands in the editing workstream.
 */
export function AccountCell({ account, className }: AccountCellProps) {
  const masked = account.maskedNumber
  return (
    <div className={cn("flex flex-row items-center gap-2", className)}>
      <MoneyAccountIcon account={account} className="size-5 text-muted-foreground" />
      {masked && <span className="text-sm font-light text-muted-foreground">{masked}</span>}
    </div>
  )
}
