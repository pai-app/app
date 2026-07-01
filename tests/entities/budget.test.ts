import { describe, it, expect } from "vitest"

import { budgetEntity, budgetYearKey } from "@/entities/budget"

import type { Budget } from "@/entities/budget"

/**
 * Runtime tests for the budget entity's key derivation. Types are erased at
 * compile time, so these exercise the actual closures — the partition function
 * and `deriveId` — that the store calls to shard and address a budget row.
 *
 * The invariants pinned here are load-bearing (§13.3, §13.4):
 *   - partition = fiscal year, so cold years evict independently;
 *   - id = `tagId:year`, so one tag has exactly one budget per year regardless
 *     of period (monthly-then-yearly upserts the same row — the xor).
 */

function makeBudget(over: Partial<Budget> = {}): Budget {
  return {
    tagId: over.tagId ?? "system-tag-food",
    year: over.year ?? 2025,
    amount: over.amount ?? 12000,
    period: over.period ?? "monthly",
  }
}

describe("budgetYearKey", () => {
  it("stringifies the fiscal year as the partition key", () => {
    expect(budgetYearKey(2025)).toBe("2025")
    expect(budgetYearKey(2030)).toBe("2030")
  })
})

describe("budgetEntity key strategy", () => {
  it("is partitioned by fiscal year", () => {
    expect(budgetEntity.keyStrategy.kind).toBe("partitioned")
  })

  it("partitions a row into its fiscal year's shard", () => {
    const partitionFn = budgetEntity.keyStrategy.partitionFn
    expect(partitionFn(makeBudget({ year: 2025 }))).toBe("2025")
    expect(partitionFn(makeBudget({ year: 2026 }))).toBe("2026")
  })

  it("names the entity 'budget'", () => {
    expect(budgetEntity.name).toBe("budget")
  })
})

describe("budgetEntity deriveId", () => {
  const deriveId = budgetEntity.deriveId

  it("addresses a row by tagId:year", () => {
    expect(deriveId?.(makeBudget({ tagId: "system-tag-food", year: 2025 }))).toBe(
      "system-tag-food:2025",
    )
  })

  it("gives the same id for monthly and yearly on one tag+year (the xor — §13.4)", () => {
    const monthly = makeBudget({ tagId: "system-tag-investments", year: 2025, period: "monthly" })
    const yearly = makeBudget({ tagId: "system-tag-investments", year: 2025, period: "yearly" })
    // Same id ⇒ the second write upserts the first: a tag can't hold both.
    expect(deriveId?.(monthly)).toBe(deriveId?.(yearly))
    expect(deriveId?.(yearly)).toBe("system-tag-investments:2025")
  })

  it("separates the same tag across different years (a fresh row per year)", () => {
    const y2025 = makeBudget({ tagId: "system-tag-food", year: 2025 })
    const y2026 = makeBudget({ tagId: "system-tag-food", year: 2026 })
    expect(deriveId?.(y2025)).not.toBe(deriveId?.(y2026))
  })
})
