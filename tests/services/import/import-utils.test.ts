import { describe, it, expect } from "vitest"
import type { BaseEntity } from "@fyre-db/core"
import type { AccountDetails } from "@pai-app/adapters"
import { accountNumbersMatch, findMatchingAccounts, mergeMetadata, orderByCompleteness } from "@/services/import/import-utils"
import type { MoneyAccount } from "@/services/entities/money-account"

describe("accountNumbersMatch", () => {
  it("matches identical numbers", () => {
    expect(accountNumbersMatch("77780100250237", "77780100250237")).toBe(true)
  })

  it("matches a masked-prefix number against the full number (Jupiter V1 vs V2)", () => {
    expect(accountNumbersMatch("77780100250237", "XXXXX0237")).toBe(true)
    expect(accountNumbersMatch("XXXXX0237", "77780100250237")).toBe(true)
  })

  it("matches two masked numbers sharing the visible suffix", () => {
    expect(accountNumbersMatch("XXXXX0237", "XXXXXXXXXX0237")).toBe(true)
  })

  it("treats two different fully-visible numbers as different accounts", () => {
    expect(accountNumbersMatch("77780100250237", "77780100259999")).toBe(false)
  })

  it("does not match when the visible suffix differs", () => {
    expect(accountNumbersMatch("77780100250237", "XXXXX9999")).toBe(false)
  })

  it("requires at least 4 visible digits to match a masked number", () => {
    expect(accountNumbersMatch("77780100250237", "XXXXX237")).toBe(false)
  })

  it("handles asterisk masking", () => {
    expect(accountNumbersMatch("77780100250237", "*****0237")).toBe(true)
  })
})

function account(over: Partial<MoneyAccount> & { id: string }): MoneyAccount & BaseEntity {
  // `findMatchingAccounts` only reads id/bankId/kind/metadata; the rest of the
  // BaseEntity envelope is irrelevant to the test, so a minimal stub is cast
  // through `unknown` rather than constructing real HLC/version fields.
  return {
    kind: "bank",
    name: "jupiter",
    currency: "INR",
    initialBalance: 0,
    bankId: "jupiter",
    metadata: {},
    ...over,
  } as unknown as MoneyAccount & BaseEntity
}

describe("findMatchingAccounts", () => {
  const details = (accountNumber: string): AccountDetails => ({
    currency: "INR",
    accountNumber: [accountNumber],
  })

  it("matches a masked emailed statement to a full-number account", () => {
    const full = account({ id: "a1", metadata: { accountNumber: ["77780100250237"] } })
    const matches = findMatchingAccounts([full], "jupiter", "bank", details("XXXXX0237"))
    expect(matches.map((m) => m.id)).toEqual(["a1"])
  })

  it("does not match across different banks", () => {
    const full = account({ id: "a1", bankId: "hdfc", metadata: { accountNumber: ["77780100250237"] } })
    const matches = findMatchingAccounts([full], "jupiter", "bank", details("XXXXX0237"))
    expect(matches).toEqual([])
  })

  it("does not match across different kinds", () => {
    const full = account({ id: "a1", kind: "wallet", metadata: { accountNumber: ["77780100250237"] } })
    const matches = findMatchingAccounts([full], "jupiter", "bank", details("XXXXX0237"))
    expect(matches).toEqual([])
  })
})

describe("orderByCompleteness", () => {
  it("orders least-masked first", () => {
    expect(orderByCompleteness(["XXXXX0237", "77780100250237"])).toEqual([
      "77780100250237",
      "XXXXX0237",
    ])
  })

  it("prefers fewer mask characters, then longer values", () => {
    expect(orderByCompleteness(["XX0237", "X0237", "1230237"])).toEqual([
      "1230237",
      "X0237",
      "XX0237",
    ])
  })
})

describe("mergeMetadata", () => {
  it("unions values per key, dedupes, and orders by completeness", () => {
    const existing = { accountNumber: ["77780100250237"], customerId: ["145803935"] }
    const incoming = { accountNumber: ["XXXXX0237"], customerId: ["145803935"], swiftCode: ["FDRLINBBIBD"] }
    const { metadata, changed } = mergeMetadata(existing, incoming)
    expect(changed).toBe(true)
    expect(metadata["accountNumber"]).toEqual(["77780100250237", "XXXXX0237"])
    expect(metadata["customerId"]).toEqual(["145803935"]) // deduped
    expect(metadata["swiftCode"]).toEqual(["FDRLINBBIBD"]) // new key carried over
  })

  it("reports no change when incoming adds nothing new", () => {
    const existing = { accountNumber: ["77780100250237", "XXXXX0237"] }
    const incoming = { accountNumber: ["XXXXX0237"] }
    const { metadata, changed } = mergeMetadata(existing, incoming)
    expect(changed).toBe(false)
    expect(metadata["accountNumber"]).toEqual(["77780100250237", "XXXXX0237"])
  })

  it("reorders an existing key when a more complete value arrives", () => {
    const existing = { accountNumber: ["XXXXX0237"] }
    const incoming = { accountNumber: ["77780100250237"] }
    const { metadata, changed } = mergeMetadata(existing, incoming)
    expect(changed).toBe(true)
    expect(metadata["accountNumber"]).toEqual(["77780100250237", "XXXXX0237"])
  })
})
