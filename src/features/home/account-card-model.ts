import type { AccountStatement, MoneyAccountKind } from "@/entities"

/**
 * Pure presentation model for the home `AccountCard`. Keeps every decision the
 * card makes from a stored statement snapshot — label by kind, the magnitude to
 * render, the credit-card extras, and the synthetic credit-limit meta row — in
 * one testable place, so the card stays a thin renderer over this shape.
 *
 * `balance` is stored signed (assets positive, liabilities negative); the UI
 * shows the magnitude with a kind label, so every amount here is non-negative.
 */

/** Credit cards are the only liability kind surfaced today; everything else is an asset. */
export function isCreditCard(kind: MoneyAccountKind): boolean {
  return kind === "credit-card"
}

/** Header label for the primary figure — assets show a "Balance", credit cards what's "Due". */
export function balanceLabel(kind: MoneyAccountKind): string {
  return isCreditCard(kind) ? "Due" : "Balance"
}

/** A synthetic key/value row injected into the card's metas list (rendered via `<Money>`). */
export type StatementMetaRow = {
  readonly key: string
  readonly label: string
  /** Minor-unit amount, rendered currency-aware via `<Money>`. */
  readonly amount: number
}

/** The card's view of a statement snapshot — magnitudes only, ready to render. */
export type AccountCardModel = {
  readonly label: string // "Balance" | "Due"
  readonly isCreditCard: boolean
  /** True once a snapshot exists; false drives the "—/No statement yet" fallback. */
  readonly hasStatement: boolean
  /** Magnitude of the closing balance/due, or undefined when there is no snapshot. */
  readonly amount?: number
  readonly asOf?: number
  /** Magnitude of the minimum due (credit-card only). */
  readonly minimumDue?: number
  readonly dueDate?: number
  /** Synthetic meta rows (currently just "Credit limit"); empty when none apply. */
  readonly metaRows: readonly StatementMetaRow[]
}

/** Synthetic meta rows derived from the snapshot — the typed credit-limit row, never a match-key. */
function statementMetaRows(statement: AccountStatement | undefined): readonly StatementMetaRow[] {
  if (statement?.creditLimit === undefined) return []
  return [{ key: "creditLimit", label: "Credit limit", amount: statement.creditLimit }]
}

/** Build the card model from an account's kind and its (optional) latest snapshot. */
export function buildAccountCardModel(
  kind: MoneyAccountKind,
  statement: AccountStatement | undefined,
): AccountCardModel {
  const creditCard = isCreditCard(kind)
  return {
    label: balanceLabel(kind),
    isCreditCard: creditCard,
    hasStatement: statement !== undefined,
    amount: statement ? Math.abs(statement.balance) : undefined,
    asOf: statement?.asOf,
    minimumDue:
      creditCard && statement?.minimumDue !== undefined ? Math.abs(statement.minimumDue) : undefined,
    dueDate: creditCard ? statement?.dueDate : undefined,
    metaRows: statementMetaRows(statement),
  }
}
