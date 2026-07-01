import { describe, it, expect } from "vitest"

import { CalibrationEngine } from "@/services/calibration/engine"

import {
  createFakeCalibrationData,
  makeBudget,
  makeSpend,
  makeTag,
} from "./fake-calibration-data"

import type { CalibrationTag, CalibrationBudget } from "@/services/calibration/types"

/**
 * End-to-end tests for the §3 first-match ladder: pre-gate → Rule 1 (budgeted)
 * → Rule 0 (committed) → Rule 3 (frequent) → Rule 4 (sporadic). Exercises the
 * canonical doc cases (15/14/16 → 23k fires; a calm month is silent) and the
 * flow-direction asymmetry (under-a-ceiling is silent, not an alert).
 */

function engineWith(
  tags: readonly CalibrationTag[],
  budgets: readonly CalibrationBudget[] = [],
): CalibrationEngine {
  return new CalibrationEngine(createFakeCalibrationData(tags, budgets))
}

describe("pre-gate — excluded flow", () => {
  it("stays silent for an excluded tag, never counted", () => {
    const tag = makeTag({ id: "system-tag-selftransfer", flow: "excluded" })
    const verdict = engineWith([tag]).calibrate(
      makeSpend({ tagId: tag.id, thisMonth: 500000, trailing: [1000, 1000] }),
    )
    expect(verdict.kind).toBe("silent")
  })
})

describe("Rule 3 — unbudgeted frequent", () => {
  const food = makeTag({ id: "system-tag-food", type: "Everyday", flow: "expense" })

  it("fires the canonical 15/14/16k → 23k hot case", () => {
    const verdict = engineWith([food]).calibrate(
      makeSpend({ tagId: food.id, thisMonth: 23000, trailing: [15000, 14000, 16000] }),
    )
    expect(verdict).toMatchObject({ kind: "alert", rule: "frequent", comparison: "above" })
    if (verdict.kind === "alert") {
      expect(verdict.deviation).toBeCloseTo(0.5333, 3)
      expect(verdict.expected).toBe(15000)
      expect(verdict.severity).toBeCloseTo(0.5333, 3)
    }
  })

  it("stays silent on a normal month (within threshold)", () => {
    const verdict = engineWith([food]).calibrate(
      makeSpend({ tagId: food.id, thisMonth: 16000, trailing: [15000, 14000, 16000] }),
    )
    expect(verdict).toMatchObject({ kind: "silent", rule: "frequent" })
  })

  it("stays silent when UNDER a ceiling (spending less is good news, not an alert)", () => {
    const verdict = engineWith([food]).calibrate(
      makeSpend({ tagId: food.id, thisMonth: 8000, trailing: [15000, 14000, 16000] }),
    )
    expect(verdict).toMatchObject({ kind: "silent", rule: "frequent" })
  })

  it("stays silent below the trailing floor (cold-start guard, §9)", () => {
    const verdict = engineWith([food]).calibrate(
      makeSpend({ tagId: food.id, thisMonth: 23000, trailing: [15000] }), // only 1 month
    )
    expect(verdict).toMatchObject({ kind: "silent", rule: "frequent" })
  })
})

describe("Rule 0 — committed", () => {
  it("flags a Fixed bill whose amount changed beyond the tighter threshold", () => {
    const rent = makeTag({ id: "system-tag-house-rentpaid", type: "Fixed", flow: "expense" })
    const verdict = engineWith([rent]).calibrate(
      makeSpend({ tagId: rent.id, thisMonth: 25000, trailing: [20000, 20000] }), // +25%
    )
    expect(verdict).toMatchObject({ kind: "alert", rule: "committed", comparison: "above" })
  })

  it("stays silent when a committed bill is stable (small wobble under threshold)", () => {
    const rent = makeTag({ id: "system-tag-house-rentpaid", type: "Fixed", flow: "expense" })
    const verdict = engineWith([rent]).calibrate(
      makeSpend({ tagId: rent.id, thisMonth: 20500, trailing: [20000, 20000] }), // +2.5%
    )
    expect(verdict).toMatchObject({ kind: "silent", rule: "committed" })
  })
})

describe("Rule 4 — unbudgeted sporadic", () => {
  it("stays silent (display-only) even on a big month — miss is free", () => {
    const travel = makeTag({ id: "system-tag-travel", type: "Occasional", flow: "expense" })
    const verdict = engineWith([travel]).calibrate(
      makeSpend({ tagId: travel.id, thisMonth: 80000, trailing: [5000, 6000] }),
    )
    expect(verdict).toMatchObject({ kind: "silent", rule: "sporadic" })
  })

  it("routes an unknown tag to sporadic and stays silent (safe default)", () => {
    const verdict = engineWith([]).calibrate(
      makeSpend({ tagId: "system-tag-mystery", thisMonth: 99999, trailing: [1, 2, 3] }),
    )
    expect(verdict).toMatchObject({ kind: "silent", rule: "sporadic" })
  })
})

describe("Rule 1 — budgeted directly", () => {
  it("returns a progress bar (not an alert) for a budgeted tag", () => {
    const food = makeTag({ id: "system-tag-food", type: "Everyday", flow: "expense" })
    const budget = makeBudget({ tagId: food.id, amount: 20000, period: "monthly" })
    const verdict = engineWith([food], [budget]).calibrate(
      makeSpend({ tagId: food.id, thisMonth: 23000, trailing: [15000, 14000, 16000], yearToDate: 15000 }),
    )
    expect(verdict).toMatchObject({ kind: "progress", rule: "budgeted-direct", period: "monthly" })
    if (verdict.kind === "progress") {
      expect(verdict.fraction).toBeCloseTo(0.75, 5) // 15000 / 20000
      expect(verdict.budget).toBe(20000)
    }
  })

  it("reads a target (investments) as a floor with raw yearly progress", () => {
    const invest = makeTag({ id: "system-tag-investments", type: "Occasional", flow: "target" })
    const budget = makeBudget({ tagId: invest.id, amount: 100000, period: "yearly" })
    const verdict = engineWith([invest], [budget]).calibrate(
      makeSpend({ tagId: invest.id, thisMonth: 10000, trailing: [], yearToDate: 40000 }),
    )
    expect(verdict).toMatchObject({ kind: "progress", direction: "floor", period: "yearly" })
    if (verdict.kind === "progress") {
      expect(verdict.fraction).toBeCloseTo(0.4, 5) // "40k of 100k invested"
    }
  })
})

describe("attentionPool — the ranked strip (§11)", () => {
  const food = makeTag({ id: "system-tag-food", type: "Everyday", flow: "expense" })
  const groceries = makeTag({ id: "system-tag-groceries", type: "Everyday", flow: "expense" })

  it("returns only alerts, ranked by severity, capped at the limit", () => {
    const engine = engineWith([food, groceries])
    const pool = engine.attentionPool(
      [
        makeSpend({ tagId: food.id, thisMonth: 23000, trailing: [15000, 14000, 16000] }),      // +53%
        makeSpend({ tagId: groceries.id, thisMonth: 12000, trailing: [10000, 10000] }),        // +20% (< 35%, silent)
      ],
      3,
    )
    expect(pool).toHaveLength(1)
    expect(pool[0]).toMatchObject({ tagId: "system-tag-food", kind: "alert" })
  })

  it("is empty on a calm month — a first-class answer, not a failure (§9)", () => {
    const engine = engineWith([food])
    const pool = engine.attentionPool([
      makeSpend({ tagId: food.id, thisMonth: 15000, trailing: [15000, 14000, 16000] }),
    ])
    expect(pool).toEqual([])
  })

  it("ranks a more severe deviation above a milder one", () => {
    const engine = engineWith([food, groceries])
    const pool = engine.attentionPool([
      makeSpend({ tagId: food.id, thisMonth: 21000, trailing: [15000, 15000] }),        // +40%
      makeSpend({ tagId: groceries.id, thisMonth: 20000, trailing: [10000, 10000] }),   // +100%
    ])
    expect(pool.map((v) => v.tagId)).toEqual(["system-tag-groceries", "system-tag-food"])
  })
})
