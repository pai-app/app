import { describe, it, expect, afterEach } from "vitest"
import type { BaseEntity, FyreDb } from "@fyre-db/core"
import type { AccountDetails, ImportData } from "@pai-app/adapters"
import {
  accountNumbersMatch,
  CancelledError,
  computeHash,
  EmailPasswordError,
  findMatchingAccounts,
  hashAndDedup,
  mergeMetadata,
  monthKeyFromEpoch,
  orderByCompleteness,
  throwIfCancelled,
} from "@/services/import/import-utils"
import { ImportContext } from "@/services/import/import-context"
import { transactionEntity } from "@/services/entities"
import { createTestFyreDb } from "../../helpers/test-fyredb"
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

  it("does not match when the parsed details carry no account number", () => {
    const full = account({ id: "a1", metadata: { accountNumber: ["77780100250237"] } })
    const noNumber: AccountDetails = { currency: "INR" }
    expect(findMatchingAccounts([full], "jupiter", "bank", noNumber)).toEqual([])
  })

  it("does not match an account that stores no account number", () => {
    const bare = account({ id: "a1", metadata: {} })
    expect(findMatchingAccounts([bare], "jupiter", "bank", details("XXXXX0237"))).toEqual([])
  })
})

describe("accountNumbersMatch — visible-suffix edge", () => {
  it("does not match when a masked value exposes no trailing digits", () => {
    expect(accountNumbersMatch("77780100250237", "XXXX")).toBe(false)
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

  it("breaks an equal-mask tie by descending length, then lexicographically", () => {
    // All unmasked (mask count 0): longest first, then localeCompare for ties.
    expect(orderByCompleteness(["bbb", "aa", "cc", "aaaa"])).toEqual([
      "aaaa",
      "bbb",
      "aa",
      "cc",
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

  it("carries over a key present only in existing (incoming adds nothing)", () => {
    const existing = { customerId: ["145803935"] }
    const incoming = { accountNumber: ["77780100250237"] }
    const { metadata, changed } = mergeMetadata(existing, incoming)
    expect(changed).toBe(true)
    expect(metadata["customerId"]).toEqual(["145803935"]) // untouched
    expect(metadata["accountNumber"]).toEqual(["77780100250237"]) // new key
  })

  it("reorders an existing key when a more complete value arrives", () => {
    const existing = { accountNumber: ["XXXXX0237"] }
    const incoming = { accountNumber: ["77780100250237"] }
    const { metadata, changed } = mergeMetadata(existing, incoming)
    expect(changed).toBe(true)
    expect(metadata["accountNumber"]).toEqual(["77780100250237", "XXXXX0237"])
  })
})

describe("computeHash", () => {
  it("is deterministic for the same inputs", () => {
    expect(computeHash(1000, -50000, "ZOMATO")).toBe(computeHash(1000, -50000, "ZOMATO"))
  })

  it("changes when any field changes", () => {
    const base = computeHash(1000, -50000, "ZOMATO")
    expect(computeHash(1001, -50000, "ZOMATO")).not.toBe(base)
    expect(computeHash(1000, -50001, "ZOMATO")).not.toBe(base)
    expect(computeHash(1000, -50000, "SWIGGY")).not.toBe(base)
  })

  it("returns a compact base-36 string", () => {
    expect(computeHash(1000, -50000, "ZOMATO")).toMatch(/^[0-9a-z]+$/)
  })
})

describe("monthKeyFromEpoch", () => {
  it("derives a UTC YYYY-MM key", () => {
    expect(monthKeyFromEpoch(Date.UTC(2026, 0, 15))).toBe("2026-01")
    expect(monthKeyFromEpoch(Date.UTC(2026, 11, 1))).toBe("2026-12")
  })
})

describe("hashAndDedup", () => {
  let fyredb: FyreDb

  afterEach(async () => {
    await fyredb.dispose().catch(() => {})
  })

  const importData = (txs: ImportData["transactions"]): ImportData => ({
    bankId: "hdfc",
    offeringId: "savings",
    kind: "bank",
    account: { currency: "INR" },
    transactions: txs,
  })

  it("flags rows present in the repo as not-new and absent rows as new", async () => {
    fyredb = await createTestFyreDb()
    const repo = fyredb.repo(transactionEntity)

    const seen = { date: Date.UTC(2026, 0, 10), amount: -50000, description: "ZOMATO" }
    const fresh = { date: Date.UTC(2026, 0, 11), amount: -12000, description: "SWIGGY" }

    // Persist a row whose id matches `seen`'s computed hash so it dedupes.
    repo.save({
      accountId: "acc-1",
      narration: seen.description,
      transactionAt: seen.date,
      amount: seen.amount,
      hash: computeHash(seen.date, seen.amount, seen.description),
    })

    const result = hashAndDedup(importData([seen, fresh]), repo)

    expect(result).toHaveLength(2)
    expect(result.find((r) => r.description === "ZOMATO")?.isNew).toBe(false)
    expect(result.find((r) => r.description === "SWIGGY")?.isNew).toBe(true)
  })
})

describe("CancelledError / throwIfCancelled", () => {
  it("does not throw for a live context", () => {
    const ctx = new ImportContext()
    expect(() => { throwIfCancelled(ctx) }).not.toThrow()
    ctx.dispose()
  })

  it("throws CancelledError once the context is cancelled", () => {
    const ctx = new ImportContext()
    ctx.cancel()
    expect(() => { throwIfCancelled(ctx) }).toThrow(CancelledError)
  })
})

describe("EmailPasswordError", () => {
  it("wraps a cause and carries the originating email id", () => {
    const cause = new Error("password required")
    const err = new EmailPasswordError("email-99", cause)
    expect(err).toBeInstanceOf(Error)
    expect(err.emailId).toBe("email-99")
    expect(err.message).toBe("password required")
    expect(err.cause).toBe(cause)
  })
})
