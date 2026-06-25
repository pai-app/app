import { type SVGProps } from "react"
import { Icon } from "@/ui/icon"
import { getBankDisplay, KIND_DISPLAY } from "@/services/catalog/bank-display"
import type { AccountIconData } from "@/services/accounts-service"

/**
 * Resolve the icon key for a money account.
 *
 *   account.icon                    // explicit user override
 *     → bank display icon           // bank brand mark when known
 *     → KIND_DISPLAY[kind].icon     // generic kind icon
 */
function resolveAccountIcon(account: AccountIconData): string {
  if (account.icon) return account.icon
  if (account.bankId) {
    const fromBank = getBankDisplay(account.bankId)?.icon
    if (fromBank) return fromBank
  }
  return KIND_DISPLAY[account.kind].icon
}

export type MoneyAccountIconProps = SVGProps<SVGSVGElement> & {
  readonly account: AccountIconData
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
