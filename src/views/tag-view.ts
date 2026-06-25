import type { AccountIconData } from "@/views/account-icon-data"

/** A tag as the UI consumes it — pure data; any React icon renderer is
 *  reattached at the UI edge (account tags carry `accountId` for that). */
export type TagView = {
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly description?: string
  readonly parent?: string
  readonly accountId?: string // set for synthetic account tags
  readonly account?: AccountIconData // icon data for synthetic account tags
}

/** A display tag plus its direct children (one level of nesting). */
export type TagNode = TagView & {
  readonly children: readonly TagView[]
}
