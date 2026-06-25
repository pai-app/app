import { AccountCell as AccountCellView } from "@/components/transaction/account-cell"
import { useObservable } from "@/providers/use-observable"
import { useServices } from "@/providers/services-provider"

export type AccountCellProps = {
  readonly accountId: string
  readonly className?: string
}

/**
 * Resolves a transaction's account by id from the accounts service and renders
 * the presentational `AccountCell` view. Returns nothing while the account is
 * unknown (e.g. before accounts have hydrated, or for an orphaned id).
 */
export function AccountCell({ accountId, className }: AccountCellProps) {
  const accounts = useObservable(useServices().accounts.accounts$)
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return null
  return <AccountCellView account={account} className={className} />
}
