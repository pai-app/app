import type { AccountStatement, AccountKind } from "@/entities"

/** A money account as the UI sees it — never the raw row. */
export type AccountView = {
  readonly id: string
  readonly name: string
  readonly kind: AccountKind
  readonly icon?: string
  readonly currency: string
  readonly maskedNumber?: string // "****1234" from metadata.accountNumber, else undefined
  readonly bankId?: string
  readonly statement?: AccountStatement // latest closing-figure snapshot, if any
  readonly archived: boolean
}
