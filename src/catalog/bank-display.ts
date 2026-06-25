/**
 * Display metadata for every bank and offering the `@pai-app/adapters` package
 * supports — labels, icon keys, and brand colors.
 *
 * This is the *only* place Pai authors display details. Identity (which banks
 * and offerings exist, and their `kind`) is owned by the adapters package and
 * exposed via `BANK_CATALOG`. The two are joined by id:
 *
 *   adapters `BANK_CATALOG`  →  what exists   (bankId, offeringId, kind)
 *   this file `BANK_DISPLAY`  →  how it looks  (label, icon, color)
 *
 * `bank-display.test.ts` asserts exact parity: every bank/offering in the
 * package must have an entry here, and no entry here may reference an id the
 * package doesn't define. Adding a bank/offering in adapters fails the test
 * until its display details are added below.
 *
 * Icon keys reference the `bank-icons` pack (see `icons.config.ts`).
 */

import type { IconKey } from "@/lib/icons"
import type { AccountKind } from "@/entities/account"

/** Display details for a single offering (product) within a bank. */
export type OfferingDisplay = {
  readonly label: string
  /** Optional icon-key override; falls back to the bank icon, then kind icon. */
  readonly icon?: IconKey
}

/** Display details for a bank and its offerings. */
export type BankDisplay = {
  readonly label: string
  readonly icon: IconKey
  /** Brand color (hex), for tinting/badges. */
  readonly color?: string
  readonly offerings: Readonly<Record<string, OfferingDisplay>>
}

export const BANK_DISPLAY: Readonly<Record<string, BankDisplay>> = {
  hdfc: {
    label: "HDFC Bank",
    icon: "bank-hdfc",
    color: "#004c8f",
    offerings: {
      savings: { label: "Savings Account" },
      "credit-card": { label: "Credit Card" },
    },
  },
  federal: {
    label: "Federal Bank",
    icon: "bank-federal",
    color: "#004cbe",
    offerings: {
      "credit-card": { label: "Credit Card" },
    },
  },
  jupiter: {
    label: "Jupiter",
    icon: "bank-jupiter",
    color: "#fc644f",
    offerings: {
      "upi-account": { label: "UPI Account" },
    },
  },
  paytm: {
    label: "Paytm Payments Bank",
    icon: "bank-paytm",
    color: "#233266",
    offerings: {
      savings: { label: "Savings Account" },
      wallet: { label: "Wallet" },
    },
  },
}

/** Display details for an account kind — the structural fallback tier. */
export type KindDisplay = {
  readonly label: string
  readonly icon: IconKey
}

/**
 * Display details per account kind — the terminal fallback when an account has
 * no explicit icon and no resolvable bank/offering. `icon` is the generic kind
 * icon; `label` is the offering-subtitle fallback for accounts that predate
 * `offeringId` persistence (or were created without a parser).
 *
 * The `Record<AccountKind, …>` type enforces exhaustiveness: a new kind
 * fails to compile until it is added here.
 */
export const KIND_DISPLAY: Readonly<Record<AccountKind, KindDisplay>> = {
  bank: { label: "Bank Account", icon: "landmark" },
  "credit-card": { label: "Credit Card", icon: "credit-card" },
  cash: { label: "Cash", icon: "wallet" },
  wallet: { label: "Wallet", icon: "wallet" },
  loan: { label: "Loan", icon: "hand-coins" },
  investment: { label: "Investment", icon: "chart-candlestick" },
}

/** Display details for a bank id, or `undefined` if the bank is unknown. */
export function getBankDisplay(bankId: string): BankDisplay | undefined {
  return Object.hasOwn(BANK_DISPLAY, bankId) ? BANK_DISPLAY[bankId] : undefined
}

/** Display details for an offering, or `undefined` if bank/offering is unknown. */
export function getOfferingDisplay(
  bankId: string,
  offeringId: string,
): OfferingDisplay | undefined {
  const bank = getBankDisplay(bankId)
  if (!bank || !Object.hasOwn(bank.offerings, offeringId)) return undefined
  return bank.offerings[offeringId]
}
