import { Minus, Plus } from "lucide-react"
import { useEntity } from "@/providers/entity-provider"
import { formatMoney, formatNumber, getCurrencyDigits, minorToMajor } from "@/lib/format"
import { Currency } from "@/ui/currency"
import { cn } from "@/lib/utils"

export type MoneyVariant = "default" | "icon"

export type MoneyProps = {
  readonly amount: number
  /** Override the user's default currency. Falls back to `useEntity().settings.currency`. */
  readonly currency?: string
  /** Override the user's default locale. Falls back to `useEntity().settings.locale`. */
  readonly locale?: string
  /**
   * - `default` (recommended) — single locale-aware string from `Intl.NumberFormat({ style: 'currency' })`
   * - `icon` — old-app layout: separate sign icon + currency icon + plain number
   */
  readonly variant?: MoneyVariant
  /** Show a leading +/- icon (only honoured by `variant="icon"`). */
  readonly sign?: boolean
  readonly className?: string
}

/**
 * Renders a money amount, locale- and currency-aware. The currency and locale
 * default to the active user's settings, and can be overridden per-call (used
 * for foreign-currency display once per-account currencies land).
 */
export function Money({
  amount,
  currency,
  locale,
  variant = "default",
  sign = true,
  className,
}: MoneyProps) {
  const { settings } = useEntity()
  const code = currency ?? settings.currency
  const loc = locale ?? settings.locale

  if (variant === "default") {
    return <span className={className}>{formatMoney(amount, { locale: loc, currency: code })}</span>
  }

  // variant === "icon" — old-app split layout. Decimals are shown only when
  // present (whole amounts render without a trailing ".00").
  const SignIcon = amount < 0 ? Minus : Plus
  const digits = getCurrencyDigits(code)
  const number = formatNumber(minorToMajor(Math.abs(amount), code), {
    locale: loc,
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })

  return (
    <span className={cn("inline-flex flex-row items-center", className)}>
      {sign && <SignIcon className="size-3 text-muted-foreground" aria-hidden />}
      <Currency code={code} variant="icon" className="size-3" aria-hidden />
      <span className="truncate">{number}</span>
    </span>
  )
}
