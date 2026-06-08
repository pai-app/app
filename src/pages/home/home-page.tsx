import { Icon } from "@/ui/icon"
import { Money } from "@/ui/money"
import { MoneyAccountIcon } from "@/ui/money-account-icon"
import { useEntity } from "@/providers/entity-provider"
import type { AccountRow } from "@/providers/entity-provider"

/**
 * Home dashboard. Until the overview widgets land, this surfaces every money
 * account as a card showing all stored metadata — useful for verifying what
 * the importer wrote.
 */
export function HomePage() {
  const { accounts } = useEntity()

  if (accounts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Icon name="home" className="size-10 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">No accounts yet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a statement or sync an email account to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Accounts</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  )
}

function AccountCard({ account }: { account: AccountRow }) {
  const metadataRows = Object.entries(account.metadata).filter(([, v]) => v.length > 0)

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <MoneyAccountIcon account={account} className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{account.name}</div>
          <div className="text-xs capitalize text-muted-foreground">{account.kind}</div>
        </div>
        {account.archived && (
          <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            Archived
          </span>
        )}
      </div>

      <dl className="flex flex-col gap-1 text-xs">
        <Row label="Currency" value={account.currency} />
        <Row
          label="Initial balance"
          value={<Money amount={account.initialBalance} currency={account.currency} sign={false} />}
        />
        {account.bankId && <Row label="Bank id" value={account.bankId} />}
        {account.icon && <Row label="Icon" value={account.icon} />}
        <Row label="Entity id" value={<span className="break-all">{account.id}</span>} />
        {metadataRows.map(([key, values]) => (
          <Row key={key} label={key} value={values.join(", ")} />
        ))}
      </dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right">{value}</dd>
    </div>
  )
}