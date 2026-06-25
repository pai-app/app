import type { AccountStatement, MoneyAccountKind } from "@/entities"

/** A money account as the UI sees it — never the raw row. */
export type AccountView = {
  readonly id: string
  readonly name: string
  readonly kind: MoneyAccountKind
  readonly icon?: string
  readonly currency: string
  readonly maskedNumber?: string // "****1234" from metadata.accountNumber, else undefined
  readonly bankId?: string
  readonly statement?: AccountStatement // latest closing-figure snapshot, if any
  readonly archived: boolean
}

/**
 * Full, on-demand account detail for verification surfaces (the home card).
 * The ONLY view that carries raw `metadata` out of the service — kept explicit
 * and read synchronously, never streamed.
 */
export type AccountDetails = {
  readonly id: string
  readonly name: string
  readonly kind: MoneyAccountKind
  readonly icon?: string
  readonly currency: string
  readonly statement?: AccountStatement
  readonly bankId?: string
  readonly offeringId?: string
  readonly archived: boolean
  readonly metadata: Record<string, readonly string[]>
}

/**
 * The structural subset of a money account the account icon needs. Both the raw
 * `MoneyAccount` row and the UI-safe `AccountView` satisfy this, so every call
 * site — raw-row or view-model — works without conversion.
 */
export type AccountIconData = {
  readonly icon?: string
  readonly bankId?: string
  readonly kind: MoneyAccountKind
}

/** Pure account-tag data (the React icon is reattached at the UI edge). */
export type AccountTagData = {
  readonly id: string // `account-<accountId>`
  readonly accountId: string
  readonly name: string // "Name ****1234"
  readonly icon?: string
  readonly kind: MoneyAccountKind
  readonly bankId?: string
  readonly parent: "system-tag-selftransfer"
}
