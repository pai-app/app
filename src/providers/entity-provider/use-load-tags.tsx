import { useEffect, useMemo, useState } from "react"
import type { BaseEntity } from "@strata/core"
import { useStrata } from "@strata/plugins-ui"
import { SYSTEM_TAGS, tagEntity, type MoneyAccount, type Tag } from "@/services/entities"
import { MoneyAccountIcon } from "@/ui/money-account-icon"
import type { ComponentType, SVGProps } from "react"
import type { AccountRow } from "./use-load-accounts"

/**
 * A tag as exposed to the UI. Three flavours feed in:
 *
 *   - **system tags** — constants from `services/entities/system-tags.ts`
 *   - **user tags** — repo rows (`Tag & BaseEntity`)
 *   - **account tags** — synthetic, projected from MoneyAccounts at read time
 *
 * The optional `iconRenderer` carries a custom React component for tags that
 * can't be drawn from the icon registry by name (e.g. account tags need
 * `<MoneyAccountIcon>` for the bank/kind/override fallback chain). When
 * absent, consumers render via `<Icon name={tag.icon} />`.
 */
export type DisplayTag = Tag & {
  readonly id: string
  readonly iconRenderer?: ComponentType<SVGProps<SVGSVGElement>>
}

/** Stable id for the synthetic Tag projected from a MoneyAccount. */
function accountTagId(accountId: string): string {
  return `account-${accountId}`
}

function maskAccountNumber(meta: MoneyAccount["metadata"]): string | undefined {
  const numbers = meta?.accountNumber
  const first = numbers?.[0]
  if (!first || first.length < 4) return undefined
  return `****${first.slice(-4)}`
}

/**
 * Project a MoneyAccount into a virtual `DisplayTag` parented to "Self
 * Transfer". The tag's `iconRenderer` closes over `<MoneyAccountIcon>` so
 * the unified bank/kind/override fallback chain — and any future user-pref
 * for how account icons render — applies anywhere the tag is shown.
 *
 * Account tags are read-time projections. They never enter the tag repo.
 * Account renames flow into the UI on the next render without a write.
 */
function accountToDisplayTag(account: AccountRow): DisplayTag {
  const masked = maskAccountNumber(account.metadata)
  const name = masked ? `${account.name} ${masked}` : account.name

  return {
    id: accountTagId(account.id),
    name,
    icon: account.icon ?? "",
    parent: "system-tag-selftransfer",
    iconRenderer: (props) => <MoneyAccountIcon account={account} {...props} />,
  }
}

/**
 * Internal hook — composes the read-time tag list:
 *   1. system tags (configured order)
 *   2. user tags (alphabetical by name)
 *   3. synthetic account tags (one per non-archived MoneyAccount)
 *
 * Only consumed by `<EntityProvider>`; consumers read the list via `useEntity()`.
 */
export function useLoadTags(accounts: readonly AccountRow[]): readonly DisplayTag[] {
  const strata = useStrata()
  const [userTags, setUserTags] = useState<readonly (Tag & BaseEntity)[]>([])

  useEffect(() => {
    if (!strata) return
    const repo = strata.repo(tagEntity)
    const sub = repo.observeQuery().subscribe(setUserTags)
    return () => { sub.unsubscribe(); }
  }, [strata])

  return useMemo<readonly DisplayTag[]>(() => {
    const sortedUserTags = [...userTags].sort((a, b) => a.name.localeCompare(b.name))
    const accountTags = accounts.filter((a) => !a.archived).map(accountToDisplayTag)
    return [...SYSTEM_TAGS, ...sortedUserTags, ...accountTags]
  }, [userTags, accounts])
}
