import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
import { MoneyAccountIcon } from "@/ui/money-account-icon"
import { cn } from "@/lib/utils"
import { useEntity } from "@/providers/entity-provider"
import type { MoneyAccount } from "@/services/entities"

export type AccountFilterProps = {
  readonly selected: readonly string[]
  readonly onChange: (accountIds: readonly string[]) => void
  readonly className?: string
}

/** Last-4 mask of an account's stored number, when available. */
function maskAccountNumber(metadata: MoneyAccount["metadata"]): string | undefined {
  const numbers = metadata["accountNumber"] as readonly string[] | undefined
  const first = numbers?.[0]
  if (!first || first.length < 4) return undefined
  return `****${first.slice(-4)}`
}

/** Multi-select account filter. Empty selection = all accounts. */
export function AccountFilter({ selected, onChange, className }: AccountFilterProps) {
  const { accounts } = useEntity()

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  const label =
    selected.length === 0
      ? "All accounts"
      : selected.length === 1
        ? accounts.find((a) => a.id === selected[0])?.name ?? "1 account"
        : `${selected.length} accounts`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("glass h-9 rounded-full border border-border font-light", className)}>
          <Icon name="landmark" />
          <span className="truncate">{label}</span>
          <Icon name="chevron-down" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-auto">
        <DropdownMenuItem onClick={() => { onChange([]) }}>
          <Icon name="landmark" className="size-4 text-muted-foreground" />
          All accounts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {accounts.map((account) => {
          const masked = maskAccountNumber(account.metadata)
          return (
            <DropdownMenuCheckboxItem
              key={account.id}
              checked={selected.includes(account.id)}
              onCheckedChange={() => { toggle(account.id) }}
              onSelect={(e) => { e.preventDefault() }}
            >
              <MoneyAccountIcon account={account} className="size-5 text-muted-foreground" />
              <span className="flex-1 truncate">{account.name}</span>
              {masked && <span className="text-xs text-muted-foreground">{masked}</span>}
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
