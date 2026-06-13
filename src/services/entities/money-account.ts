import { defineEntity } from "@fyre-db/core"
import type { Money } from "./money"

/**
 * Money account types. Drives:
 * - sign convention (credit-card balances are typically negative)
 * - balance display ("available" vs "owed")
 * - default icon when none is set on the account
 *
 * Closed enum: parsers and UI both branch on `kind`, so adding a new kind is
 * a deliberate change.
 */
export type MoneyAccountKind =
  | "bank"
  | "credit-card"
  | "cash"
  | "wallet"
  | "loan"
  | "investment"

export const MONEY_ACCOUNT_KINDS: readonly MoneyAccountKind[] = [
  "bank",
  "credit-card",
  "cash",
  "wallet",
  "loan",
  "investment",
]

/**
 * A money account — bank, credit card, cash, wallet, etc. Stored globally
 * per tenant.
 *
 * Storage is intentionally minimal:
 * - `kind` drives behaviour
 * - `name` is the user-facing label
 * - `bankId` is the parser registry id (set only when a parser owns this account)
 * - `icon` is an override; UI falls back to bank icon → kind default
 * - `metadata` holds parser match-keys (accountNumber, ifscCode, etc.) as
 *   open-ended `key → string[]` so parsers can evolve their matching scheme
 *   without entity migrations. Always present (empty `{}` when none known).
 */
export type MoneyAccount = {
  readonly kind: MoneyAccountKind
  readonly name: string
  readonly currency: string                                    // ISO 4217
  readonly initialBalance: Money
  readonly bankId?: string
  readonly icon?: string                                       // override
  readonly metadata: Record<string, readonly string[]>
  readonly archived?: boolean
}

export const moneyAccountEntity = defineEntity<MoneyAccount>("money-account", {
  keyStrategy: "global",
})
