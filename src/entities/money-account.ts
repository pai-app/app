import type { AccountKind } from "@pai-app/adapters"
import type { Money } from "./money"

/**
 * Money account types. Drives:
 * - sign convention (credit-card balances are typically negative)
 * - balance display ("available" vs "owed")
 * - default icon when none is set on the account
 *
 * Aliased to the adapters package's `AccountKind` — parser-emitted kinds and
 * app account kinds are the same closed enum by rule, so there is a single
 * source of truth. Adding a new kind is a deliberate change in one place.
 */
export type MoneyAccountKind = AccountKind

/**
 * A money account — bank, credit card, cash, wallet, etc. Stored globally
 * per tenant.
 *
 * Storage is intentionally minimal:
 * - `kind` drives behaviour
 * - `name` is the user-facing label
 * - `bankId` is the parser registry id (set only when a parser owns this account)
 * - `offeringId` is the parser offering id within the bank (e.g. "savings",
 *   "credit-card") — set alongside `bankId`; drives the offering display label
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
  readonly offeringId?: string
  readonly icon?: string                                       // override
  readonly metadata: Record<string, readonly string[]>
  readonly archived?: boolean
}
