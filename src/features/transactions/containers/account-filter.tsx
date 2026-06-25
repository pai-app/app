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
import { MoneyAccountIcon } from "@/components/money-account-icon"
import { cn } from "@/lib/utils"
import { useObservable } from "@/providers/use-observable"
import { useServices } from "@/providers/services-provider"
import type { FilterControlProps } from "../types"

/** Multi-select account filter. Empty selection = all accounts. */
export function AccountFilter({ state, variant = "bar", className }: FilterControlProps) {
  const { filter, patch } = state
  const selected = filter.accountIds
  const accounts = useObservable(useServices().accounts.accounts$)

  const toggle = (id: string) => {
    patch({ accountIds: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] })
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
        <Button
          variant="ghost"
          className={cn(
            "glass h-9 rounded-full border border-border font-light",
            variant === "sheet" && "w-full justify-start",
            className,
          )}
        >
          <Icon name="landmark" />
          <span className="truncate">{label}</span>
          <Icon name="chevron-down" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-auto">
        <DropdownMenuItem onClick={() => { patch({ accountIds: [] }) }}>
          <Icon name="landmark" className="size-4 text-muted-foreground" />
          All accounts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {accounts.map((account) => {
          const masked = account.maskedNumber
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
