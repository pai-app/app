import { type SVGProps } from "react"
import { Icon } from "@/ui/icon"
import { MoneyAccountIcon } from "@/ui/money-account-icon"
import type { TagView } from "@/services/tags-service"

export type TagIconProps = SVGProps<SVGSVGElement> & {
  readonly tag: TagView
}

/**
 * Renders the icon for a `TagView`. Synthetic account tags carry `account`
 * icon data and render via `<MoneyAccountIcon>` (the bank/kind/override
 * fallback chain); everything else renders via `<Icon name={tag.icon}>`.
 *
 * Single branch, single place to evolve when new tag flavours add custom
 * renderers.
 */
export function TagIcon({ tag, ...rest }: TagIconProps) {
  if (tag.account) {
    return <MoneyAccountIcon account={tag.account} {...rest} />
  }
  return <Icon name={tag.icon} {...rest} />
}
