import { describe, it, expect } from "vitest"
import { fiscalYearMonthKeys } from "@/lib/fiscal"

describe("fiscalYearMonthKeys", () => {
  it("returns 12 consecutive month keys for a calendar-aligned year", () => {
    expect(fiscalYearMonthKeys(2025, 1)).toEqual([
      "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
      "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
    ])
  })

  it("wraps into the next calendar year when firstMonth > 1", () => {
    expect(fiscalYearMonthKeys(2025, 4)).toEqual([
      "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09",
      "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
    ])
  })

  it("handles a December start, spanning a single calendar boundary", () => {
    const keys = fiscalYearMonthKeys(2025, 12)
    expect(keys).toHaveLength(12)
    expect(keys[0]).toBe("2025-12")
    expect(keys[1]).toBe("2026-01")
    expect(keys[11]).toBe("2026-11")
  })
})
