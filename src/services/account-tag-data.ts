import type { AccountKind } from "@/entities"

/** Pure account-tag data (the React icon is reattached at the UI edge). */
export type AccountTagData = {
  readonly id: string // `account-<accountId>`
  readonly accountId: string
  readonly name: string // "Name ****1234"
  readonly icon?: string
  readonly kind: AccountKind
  readonly bankId?: string
  readonly parent: "system-tag-selftransfer"
}
