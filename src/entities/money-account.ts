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
 * Latest statement snapshot for an account. Captures the closing figures the
 * parser could read from a statement; `asOf` drives latest-wins on import (a
 * newer snapshot supersedes an older one). Only the latest is kept — no history.
 *
 * `balance` is signed by asset/liability convention (assets positive,
 * liabilities — credit cards, loans — negative) so balances are directly
 * summable for net worth. The credit-only fields are naturally absent on asset
 * accounts. Mirrors the adapters' `StatementSummary`, mapped near 1:1.
 */
export type AccountStatement = {
  readonly asOf: number          // statement close date (ms epoch) — the latest periodEnd seen
  readonly balance: Money        // closing balance — assets +, liabilities −
  readonly available?: Money     // available funds / available credit
  readonly creditLimit?: Money   // credit-card
  readonly minimumDue?: Money    // credit-card
  readonly dueDate?: number      // credit-card payment due (ms epoch)
}

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
 * - `statement` is the latest closing-figure snapshot (balance/due as of a
 *   date); optional and superseded latest-wins on import (never a match-key).
 */
export type MoneyAccount = {
  readonly kind: MoneyAccountKind
  readonly name: string
  readonly currency: string                                    // ISO 4217
  readonly bankId?: string
  readonly offeringId?: string
  readonly icon?: string                                       // override
  readonly metadata: Record<string, readonly string[]>
  readonly statement?: AccountStatement
  readonly archived?: boolean
}
