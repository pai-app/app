import { type SVGProps } from "react"
import { Icon } from "@/ui/icon"
import type { DisplayTag } from "@/providers/entity-provider"

export type TagIconProps = SVGProps<SVGSVGElement> & {
  readonly tag: DisplayTag
}

/**
 * Renders the icon for a `DisplayTag`. A tag with an `iconRenderer` (e.g.
 * synthetic account tags closing over `<MoneyAccountIcon>`) drives that
 * component directly; everything else renders via `<Icon name={tag.icon}>`.
 *
 * Single branch, single place to evolve when new tag flavours add custom
 * renderers.
 */
export function TagIcon({ tag, ...rest }: TagIconProps) {
  if (tag.iconRenderer) {
    const Renderer = tag.iconRenderer
    return <Renderer {...rest} />
  }
  return <Icon name={tag.icon} {...rest} />
}
