import { describe, it, expect } from "vitest"
import type { AccountStatement } from "@/entities"
import {
  balanceLabel,
  buildAccountCardModel,
  isCreditCard,
} from "@/features/home/account-card-model"

// A full credit-card snapshot — balance stored negative (liability), with the
// credit-only extras populated.
const CREDIT_STATEMENT: AccountStatement = {
  asOf: Date.UTC(2024, 5, 5),
  balance: -1_234_56, // ₹1,234.56 owed
  available: 8_765_44,
  creditLimit: 10_000_00,
  minimumDue: 200_00,
  dueDate: Date.UTC(2024, 5, 25),
}

// An asset (savings) snapshot — balance stored positive, no credit extras.
const ASSET_STATEMENT: AccountStatement = {
  asOf: Date.UTC(2024, 5, 5),
  balance: 50_000_00,
}

describe("account-card-model", () => {
  it("labels and classifies by kind", () => {
    expect(balanceLabel("bank")).toBe("Balance")
    expect(balanceLabel("wallet")).toBe("Balance")
    expect(balanceLabel("credit-card")).toBe("Due")
    expect(isCreditCard("credit-card")).toBe(true)
    expect(isCreditCard("bank")).toBe(false)
  })

  it("renders an asset card: balance magnitude + as-of, no credit extras", () => {
    const model = buildAccountCardModel("bank", ASSET_STATEMENT)

    expect(model.label).toBe("Balance")
    expect(model.isCreditCard).toBe(false)
    expect(model.hasStatement).toBe(true)
    expect(model.amount).toBe(50_000_00) // magnitude (already positive)
    expect(model.asOf).toBe(ASSET_STATEMENT.asOf)
    expect(model.minimumDue).toBeUndefined()
    expect(model.dueDate).toBeUndefined()
    expect(model.metaRows).toEqual([])
  })

  it("renders a credit-card card: due magnitude, min due, due date + credit-limit meta row", () => {
    const model = buildAccountCardModel("credit-card", CREDIT_STATEMENT)

    expect(model.label).toBe("Due")
    expect(model.isCreditCard).toBe(true)
    expect(model.hasStatement).toBe(true)
    // Stored negative; the UI shows the positive owed amount (magnitude).
    expect(model.amount).toBe(1_234_56)
    expect(model.asOf).toBe(CREDIT_STATEMENT.asOf)
    expect(model.minimumDue).toBe(200_00)
    expect(model.dueDate).toBe(CREDIT_STATEMENT.dueDate)
    // Credit limit is a synthetic typed-Money meta row, never a string match-key.
    expect(model.metaRows).toEqual([
      { key: "creditLimit", label: "Credit limit", amount: 10_000_00 },
    ])
  })

  it("does not surface credit extras on an asset account that happens to carry them", () => {
    // Defensive: extras only render for credit cards regardless of snapshot.
    const model = buildAccountCardModel("bank", CREDIT_STATEMENT)

    expect(model.label).toBe("Balance")
    expect(model.minimumDue).toBeUndefined()
    expect(model.dueDate).toBeUndefined()
    // The credit-limit meta row is data-driven (present whenever the snapshot has one).
    expect(model.metaRows).toEqual([
      { key: "creditLimit", label: "Credit limit", amount: 10_000_00 },
    ])
  })

  it("falls back gracefully when an account has no snapshot", () => {
    const asset = buildAccountCardModel("bank", undefined)
    expect(asset.label).toBe("Balance")
    expect(asset.hasStatement).toBe(false)
    expect(asset.amount).toBeUndefined()
    expect(asset.asOf).toBeUndefined()
    expect(asset.metaRows).toEqual([])

    const credit = buildAccountCardModel("credit-card", undefined)
    expect(credit.label).toBe("Due")
    expect(credit.hasStatement).toBe(false)
    expect(credit.amount).toBeUndefined()
    expect(credit.minimumDue).toBeUndefined()
    expect(credit.dueDate).toBeUndefined()
    expect(credit.metaRows).toEqual([])
  })
})
