import { type SVGProps } from "react"
import { Icon } from "@/ui/icon"
import type { MoneyAccount, MoneyAccountKind } from "@/services/entities"

/** Default icon when an account has no `icon` override and no resolvable bank. */
const KIND_ICON: Record<MoneyAccountKind, string> = {
  bank: "landmark",
  "credit-card": "credit-card",
  cash: "wallet",
  wallet: "wallet",
  loan: "hand-coins",
  investment: "chart-candlestick",
}

/**
 * Bank id → bank icon key in the `bank-icons` pack. Stub registry — will
 * move into `fin-parsers` (A1) when that lands. Until then the table lives
 * here so the icon fallback chain runs through one path.
 */
const BANK_ICON: Readonly<Record<string, string>> = {
  federal: "bank-federal",
  hdfc: "bank-hdfc",
  jupiter: "bank-jupiter",
  paytm: "bank-paytm",
}

/**
 * Resolve the icon key for a money account.
 *
 *   account.icon            // explicit user override
 *     → BANK_ICON[bankId]   // bank brand mark when known
 *     → KIND_ICON[kind]     // generic kind icon
 */
function resolveAccountIcon(account: MoneyAccount): string {
  if (account.icon) return account.icon
  if (account.bankId) {
    const fromBank = BANK_ICON[account.bankId]
    if (fromBank) return fromBank
  }
  return KIND_ICON[account.kind]
}

export type MoneyAccountIconProps = SVGProps<SVGSVGElement> & {
  readonly account: MoneyAccount
}

/**
 * Icon for a MoneyAccount, with the unified fallback chain:
 *   account.icon → bank icon → kind default
 *
 * Centralised so UI evolution (composite icons, kind badges, monogram
 * fallbacks…) lands in one place. Pass the full `account` object so future
 * variants — e.g. tinting by `kind`, or stacking a bank mark with a kind
 * badge — can read whatever fields they need.
 */
export function MoneyAccountIcon({ account, ...svgProps }: MoneyAccountIconProps) {
  return <Icon name={resolveAccountIcon(account)} {...svgProps} />
}
