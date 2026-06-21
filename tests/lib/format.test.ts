import { describe, it, expect } from "vitest"
import {
  CURRENCIES,
  formatMoney,
  formatNumber,
  getCurrencyDigits,
  getCurrencyMeta,
  isKnownCurrency,
  minorToMajor,
} from "@/lib/format"

describe("getCurrencyMeta / isKnownCurrency", () => {
  it("returns metadata for a known currency", () => {
    const inr = getCurrencyMeta("INR")
    expect(inr?.symbol).toBe("₹")
    expect(inr?.locale).toBe("en-IN")
    expect(CURRENCIES.INR).toEqual(inr)
  })

  it("returns undefined for an unknown currency", () => {
    expect(getCurrencyMeta("ZZZ")).toBeUndefined()
  })

  it("narrows known currency codes", () => {
    expect(isKnownCurrency("USD")).toBe(true)
    expect(isKnownCurrency("ZZZ")).toBe(false)
  })
})

describe("getCurrencyDigits", () => {
  it("returns 2 for a two-decimal currency", () => {
    expect(getCurrencyDigits("INR")).toBe(2)
    expect(getCurrencyDigits("USD")).toBe(2)
  })

  it("returns 0 for a zero-decimal currency", () => {
    expect(getCurrencyDigits("JPY")).toBe(0)
  })

  it("falls back to 2 for an invalid currency code", () => {
    expect(getCurrencyDigits("not-a-currency")).toBe(2)
  })
})

describe("minorToMajor", () => {
  it("scales by the currency's minor-unit count", () => {
    expect(minorToMajor(-123450, "INR")).toBe(-1234.5)
    expect(minorToMajor(0, "INR")).toBe(0)
  })

  it("is identity for a zero-decimal currency", () => {
    expect(minorToMajor(1000, "JPY")).toBe(1000)
  })
})

describe("formatMoney", () => {
  it("formats a negative minor amount with grouping and symbol", () => {
    const out = formatMoney(-123450, { locale: "en-IN", currency: "INR" })
    expect(out).toContain("₹")
    expect(out).toContain("1,234.50")
    expect(out.startsWith("-")).toBe(true)
  })

  it("formats a zero-decimal currency without fraction digits", () => {
    const out = formatMoney(1000, { locale: "ja-JP", currency: "JPY" })
    expect(out).toContain("1,000")
    expect(out).not.toContain(".00")
  })
})

describe("formatNumber", () => {
  it("applies explicit fraction digits and locale grouping", () => {
    expect(
      formatNumber(1234.5, { locale: "en-US", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ).toBe("1,234.50")
  })

  it("formats without explicit fraction options", () => {
    expect(formatNumber(42, { locale: "en-US" })).toBe("42")
  })
})
