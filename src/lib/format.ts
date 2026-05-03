/**
 * Locale-aware formatting helpers for money and numbers.
 *
 * All amounts are stored as major units (e.g. `1234.5` = ₹1,234.50). Decimal
 * precision per currency is taken from the runtime via `Intl.NumberFormat`.
 */

export type CurrencyCode =
  | "INR" | "USD" | "EUR" | "GBP" | "JPY"
  | "GEL" | "PHP" | "RUB" | "SAR" | "CHF" | "TRY"

export type CurrencyMeta = {
  readonly code: CurrencyCode
  readonly name: string
  readonly symbol: string
  readonly locale: string
  /** Key into the icon system — see `currency-icons` pack in `icons.config.ts`. */
  readonly iconName: string
}

const CURRENCIES_LIST: readonly CurrencyMeta[] = [
  { code: "INR", name: "Indian Rupee",     symbol: "₹", locale: "en-IN", iconName: "indian-rupee"    },
  { code: "USD", name: "US Dollar",        symbol: "$", locale: "en-US", iconName: "dollar-sign"     },
  { code: "EUR", name: "Euro",             symbol: "€", locale: "de-DE", iconName: "euro"            },
  { code: "GBP", name: "British Pound",    symbol: "£", locale: "en-GB", iconName: "pound-sterling"  },
  { code: "JPY", name: "Japanese Yen",     symbol: "¥", locale: "ja-JP", iconName: "japanese-yen"    },
  { code: "GEL", name: "Georgian Lari",    symbol: "₾", locale: "ka-GE", iconName: "georgian-lari"   },
  { code: "PHP", name: "Philippine Peso",  symbol: "₱", locale: "en-PH", iconName: "philippine-peso" },
  { code: "RUB", name: "Russian Ruble",    symbol: "₽", locale: "ru-RU", iconName: "russian-ruble"   },
  { code: "SAR", name: "Saudi Riyal",      symbol: "﷼", locale: "ar-SA", iconName: "saudi-riyal"     },
  { code: "CHF", name: "Swiss Franc",      symbol: "₣", locale: "de-CH", iconName: "swiss-franc"     },
  { code: "TRY", name: "Turkish Lira",     symbol: "₺", locale: "tr-TR", iconName: "turkish-lira"    },
]

export const CURRENCIES: Readonly<Partial<Record<CurrencyCode, CurrencyMeta>>> =
  Object.fromEntries(CURRENCIES_LIST.map((c) => [c.code, c]))

export function getCurrencyMeta(code: string): CurrencyMeta | undefined {
  return CURRENCIES[code as CurrencyCode]
}

export function isKnownCurrency(code: string): code is CurrencyCode {
  return code in CURRENCIES
}

/**
 * Formats `amount` as a complete currency string using `Intl.NumberFormat`.
 * Example: `formatMoney(-1234.5, { locale: 'en-IN', currency: 'INR' })` → `"-₹1,234.50"`.
 */
export function formatMoney(
  amount: number,
  opts: { readonly locale: string; readonly currency: string },
): string {
  return new Intl.NumberFormat(opts.locale, {
    style: "currency",
    currency: opts.currency,
  }).format(amount)
}

/**
 * Formats `amount` as a locale-aware number string with explicit decimals.
 * Used for the icon-style `<Money>` variant where the currency icon is
 * rendered separately.
 */
export function formatNumber(
  value: number,
  opts: {
    readonly locale: string
    readonly minimumFractionDigits?: number
    readonly maximumFractionDigits?: number
  },
): string {
  return new Intl.NumberFormat(opts.locale, {
    minimumFractionDigits: opts.minimumFractionDigits,
    maximumFractionDigits: opts.maximumFractionDigits,
  }).format(value)
}

/**
 * Returns the standard minor-unit count for a currency.
 * (JPY = 0, most others = 2.)
 */
export function getCurrencyDigits(code: string): number {
  // Use Intl to introspect — handles every ISO 4217 code, falls back to 2.
  try {
    const parts = new Intl.NumberFormat("en", { style: "currency", currency: code }).formatToParts(0)
    const fraction = parts.find((p) => p.type === "fraction")
    return fraction ? fraction.value.length : 0
  } catch {
    return 2
  }
}
