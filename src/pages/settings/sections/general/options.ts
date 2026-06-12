import { CURRENCIES, type CurrencyMeta } from "@/lib/format"

/** A single choice in a settings dropdown. */
export type SettingOption = {
  readonly value: string
  readonly label: string
}

/** Currency choices sourced from the shared currency table. */
export function currencyOptions(): readonly SettingOption[] {
  return Object.values(CURRENCIES)
    .filter((c): c is CurrencyMeta => c !== undefined)
    .map((c) => ({ value: c.code, label: `${c.name} (${c.symbol})` }))
}

/** Localized month names keyed by fiscal month number (1..12). */
export function monthOptions(locale: string): readonly SettingOption[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" })
  return Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: fmt.format(new Date(Date.UTC(2020, i, 1))),
  }))
}

/** Localized weekday names keyed by ISO 8601 day number (1=Mon..7=Sun). */
export function dayOptions(locale: string): readonly SettingOption[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" })
  // 2024-01-01 is a Monday, so day i (1..7) maps to Jan 1..7.
  return Array.from({ length: 7 }, (_, i) => ({
    value: String(i + 1),
    label: fmt.format(new Date(Date.UTC(2024, 0, 1 + i))),
  }))
}
