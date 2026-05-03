import type { SVGProps } from "react"
import { getCurrencyMeta } from "@/lib/format"
import { Icon } from "@/ui/icon"

export type CurrencyVariant = "icon" | "text" | "code"

export type CurrencyProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  readonly code: string
  readonly variant?: CurrencyVariant
}

/**
 * Renders a currency in one of three styles:
 *  - `icon` (default) — currency-icons pack, lazy-loaded via the icon system
 *  - `text` — bare symbol string (e.g. "₹")
 *  - `code` — ISO 4217 code (e.g. "INR")
 *
 * Returns `null` for unknown codes when `variant === "icon"`. For text/code
 * variants, falls back to the raw input.
 */
export function Currency({ code, variant = "icon", className, ...rest }: CurrencyProps) {
  const meta = getCurrencyMeta(code)

  if (variant === "code") {
    return <span className={className}>{meta?.code ?? code}</span>
  }

  if (variant === "text") {
    return <span className={className}>{meta?.symbol ?? code}</span>
  }

  if (!meta) return null
  return <Icon name={meta.iconName} className={className} {...rest} />
}
