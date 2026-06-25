import type { AccountIconData } from "@/views/account-icon-data"
import type { TagView } from "@/views/tag-view"
import { getBankDisplay, KIND_DISPLAY } from "./bank-display"

/**
 * Resolve the icon name for a money account, with the unified fallback chain:
 *
 *   account.icon                    // explicit user override
 *     → bank display icon           // bank brand mark when known
 *     → KIND_DISPLAY[kind].icon     // generic kind icon
 *
 * Pure: returns the icon name for `<Icon name={…} />`; no React.
 */
export function accountIconName(account: AccountIconData): string {
  if (account.icon) return account.icon
  if (account.bankId) {
    const fromBank = getBankDisplay(account.bankId)?.icon
    if (fromBank) return fromBank
  }
  return KIND_DISPLAY[account.kind].icon
}

/**
 * Resolve the icon name for a `TagView`. Synthetic account tags carry `account`
 * icon data and resolve through the account fallback chain; everything else
 * uses the tag's own `icon`.
 */
export function tagIconName(tag: TagView): string {
  return tag.account ? accountIconName(tag.account) : tag.icon
}
