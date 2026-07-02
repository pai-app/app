import { describe, it, expect } from "vitest"

import { AttentionEngine } from "@/services/attention/engine"
import { profileFor, signalOf, gateClass } from "@/services/attention/engine-internals"

import {
  createFakeCalibrationData,
  makeBudget,
  makeSpend,
  makeTag,
} from "../calibration/fake-calibration-data"

import type { CalibrationTag, CalibrationBudget } from "@/services/calibration/types"

/**
 * The attention function (§15) — the selection layer above the calibration
 * engine. These tests pin the settled behaviour of the whole strip: the per-type
 * FLOOR/GATE/HEADLINE trip-wire (§15.2), the %-admits/₹-ranks prominence split
 * with clubbing + cap (§15.3), what's routed OFF the strip (§15.4), and the
 * empty-state good-month note (§15.5). The canonical §15.7 worked month is the
 * end-to-end anchor.
 *
 * Amounts are minor units (paise): ₹1 = 100. `R` keeps the cases readable in ₹.
 */

const R = (rupees: number): number => Math.round(rupees * 100)

function engineWith(
  tags: readonly CalibrationTag[],
  budgets: readonly CalibrationBudget[] = [],
): AttentionEngine {
  return new AttentionEngine(createFakeCalibrationData(tags, budgets))
}

// The six categories of the §15.7 worked month, as catalogue-shaped tags.
const FOOD = makeTag({ id: "system-tag-food", name: "Food", type: "Everyday", flow: "expense" })
const RENT = makeTag({ id: "system-tag-rent", name: "Rent", type: "Fixed", flow: "expense" })
const NETFLIX = makeTag({ id: "system-tag-netflix", name: "Netflix", type: "Fixed", flow: "expense" })
const DINING = makeTag({ id: "system-tag-dining", name: "Dining", type: "Everyday", flow: "expense" })
const GROCERIES = makeTag({ id: "system-tag-groceries", name: "Groceries", type: "Everyday", flow: "expense" })
const FUEL = makeTag({ id: "system-tag-fuel", name: "Fuel", type: "Everyday", flow: "expense" })

describe("§15.7 — the worked month, end to end", () => {
  const engine = engineWith([FOOD, RENT, NETFLIX, DINING, GROCERIES, FUEL])
  const strip = engine.compose([
    makeSpend({ tagId: FOOD.id, thisMonth: R(23000), trailing: [R(15000), R(14000), R(16000)] }),
    makeSpend({ tagId: RENT.id, thisMonth: R(55000), trailing: [R(50000), R(50000), R(50000)] }),
    makeSpend({ tagId: NETFLIX.id, thisMonth: R(799), trailing: [R(649), R(649), R(649)] }),
    makeSpend({ tagId: DINING.id, thisMonth: R(4200), trailing: [R(3000), R(3000), R(3000)] }),
    makeSpend({ tagId: GROCERIES.id, thisMonth: R(9100), trailing: [R(8000), R(8000), R(8000)] }),
    makeSpend({ tagId: FUEL.id, thisMonth: R(3400), trailing: [R(3000), R(3000), R(3000)] }),
  ])

  it("headlines Food then Rent, ranked by ₹ severity", () => {
    expect(strip.headlines.map((h) => h.tagId)).toEqual([FOOD.id, RENT.id])
  })

  it("Food headline is +₹8,000 over the median-15k baseline (not 16k)", () => {
    expect(strip.headlines[0].deviationAmount, "median of 15/14/16 is 15k → 23k−15k").toBe(R(8000))
  })

  it("Rent headlines on the ₹ override despite a quiet +10% (< 15% gate)", () => {
    expect(strip.headlines[1].deviationAmount).toBe(R(5000))
    expect(strip.headlines[1].deviationFraction, "quiet %").toBeCloseTo(0.1, 5)
  })

  it("clubs Netflix + Dining — admitted on % but under the ₹ headline line", () => {
    // Ranked by ₹: Dining (+₹1,200) before Netflix (+₹150).
    expect(strip.club?.tagIds).toEqual([DINING.id, NETFLIX.id])
    expect(strip.club?.count).toBe(2)
    expect(strip.club?.combinedAmount, "1200 + 150").toBe(R(1350))
  })

  it("stays silent on Groceries (+14% < 35% gate, not big-₹) and Fuel (< ₹1k floor)", () => {
    const shown = [...strip.headlines.map((h) => h.tagId), ...(strip.club?.tagIds ?? [])]
    expect(shown).not.toContain(GROCERIES.id)
    expect(shown).not.toContain(FUEL.id)
  })

  it("shows no appreciation when the strip has headlines", () => {
    expect(strip.appreciations).toEqual([])
  })
})

describe("§15.2 — the per-type gate", () => {
  it("admits a Fixed category on a small % move that an Everyday would ignore", () => {
    // +20% on both. Fixed gate 15% → admitted; Everyday gate 35% → silent.
    const fixed = makeTag({ id: "system-tag-fixed", type: "Fixed", flow: "expense" })
    const everyday = makeTag({ id: "system-tag-everyday", type: "Everyday", flow: "expense" })
    const spend = (id: string) =>
      makeSpend({ tagId: id, thisMonth: R(1200), trailing: [R(1000), R(1000), R(1000)] })

    const fixedStrip = engineWith([fixed]).compose([spend(fixed.id)])
    const everydayStrip = engineWith([everyday]).compose([spend(everyday.id)])

    // ₹200 on a ₹1k base: under both floors as a headline, but Fixed's low floor
    // (₹100) + 15% gate admits it to the club; Everyday's ₹1k floor blocks it.
    expect(fixedStrip.club?.tagIds, "Fixed admits +20%").toEqual([fixed.id])
    expect(everydayStrip.club, "Everyday ignores +20%").toBeUndefined()
    expect(everydayStrip.headlines, "…and no headline either").toEqual([])
  })
})

describe("§15.3 — prominence: ₹ ranks, cap folds overflow into the club", () => {
  it("keeps only MAX_HEADLINES headlines and folds the rest into the club, ₹-ordered", () => {
    // Five Everyday categories, each far over the ₹5k headline line, descending.
    const overs = [20000, 18000, 16000, 14000, 12000]
    const tags = overs.map((_, i) =>
      makeTag({ id: `system-tag-cat${i}`, type: "Everyday", flow: "expense" }),
    )
    const spends = overs.map((o, i) =>
      makeSpend({
        tagId: `system-tag-cat${i}`,
        thisMonth: R(10000 + o),
        trailing: [R(10000), R(10000), R(10000)],
      }),
    )
    const strip = engineWith(tags).compose(spends)

    expect(strip.headlines.map((h) => h.tagId), "top 3 by ₹").toEqual([
      "system-tag-cat0",
      "system-tag-cat1",
      "system-tag-cat2",
    ])
    expect(strip.club?.tagIds, "overflow folds, still ₹-ordered").toEqual([
      "system-tag-cat3",
      "system-tag-cat4",
    ])
    expect(strip.club?.count).toBe(2)
  })
})

describe("§15.4 — what the strip is not allowed to say", () => {
  const engine = (tag: CalibrationTag, budgets: readonly CalibrationBudget[] = []) =>
    engineWith([tag], budgets)

  it("routes an excluded tag off the strip entirely", () => {
    const t = makeTag({ id: "system-tag-selftransfer", flow: "excluded" })
    const strip = engine(t).compose([
      makeSpend({ tagId: t.id, thisMonth: R(99999), trailing: [R(0), R(0), R(0)] }),
    ])
    expect(strip.headlines).toEqual([])
    expect(strip.club).toBeUndefined()
  })

  it("routes a budgeted category to its progress bar, not the strip", () => {
    const t = makeTag({ id: "system-tag-groceries", type: "Everyday", flow: "expense" })
    const budget = makeBudget({ tagId: t.id, amount: R(10000), period: "monthly" })
    const strip = engine(t, [budget]).compose([
      makeSpend({ tagId: t.id, thisMonth: R(50000), trailing: [R(8000), R(8000), R(8000)] }),
    ])
    expect(strip.headlines, "a budgeted over is a bar, not a strip alert").toEqual([])
  })

  it("routes a floor (target) to the floor-watch feeder, not this gate", () => {
    const sip = makeTag({ id: "system-tag-investments", type: "Occasional", flow: "target" })
    const strip = engine(sip).compose([
      makeSpend({ tagId: sip.id, thisMonth: R(0), trailing: [R(20000), R(20000), R(20000)] }),
    ])
    expect(strip.headlines).toEqual([])
    expect(strip.club).toBeUndefined()
  })

  it("keeps an Occasional-ceiling spike off the strip (it belongs in composition)", () => {
    const medical = makeTag({ id: "system-tag-medical", type: "Occasional", flow: "expense" })
    const strip = engine(medical).compose([
      makeSpend({ tagId: medical.id, thisMonth: R(50000), trailing: [R(2000), R(2000), R(2000)] }),
    ])
    expect(strip.headlines).toEqual([])
    expect(strip.club).toBeUndefined()
  })

  it("stays silent on a cold-start category (too few trailing months)", () => {
    const t = makeTag({ id: "system-tag-new", type: "Everyday", flow: "expense" })
    const strip = engine(t).compose([
      makeSpend({ tagId: t.id, thisMonth: R(90000), trailing: [R(10000)] }),
    ])
    expect(strip.headlines, "MIN_TRAILING guard, §9").toEqual([])
  })
})

describe("§15.5 — the empty state", () => {
  it("enumerates material favorable standouts, ranked by ₹", () => {
    const food = makeTag({ id: "system-tag-food", type: "Everyday", flow: "expense" })
    const dining = makeTag({ id: "system-tag-dining", type: "Everyday", flow: "expense" })
    const rent = makeTag({ id: "system-tag-rent", type: "Fixed", flow: "expense" })
    const strip = engineWith([food, dining, rent]).compose([
      // Food down ₹6k on ₹15k = −40% (clears Everyday gate + floor) → a win.
      makeSpend({ tagId: food.id, thisMonth: R(9000), trailing: [R(15000), R(15000), R(15000)] }),
      // Dining down ₹1.2k on ₹3k = −40% → a smaller win.
      makeSpend({ tagId: dining.id, thisMonth: R(1800), trailing: [R(3000), R(3000), R(3000)] }),
      // Rent flat → nothing.
      makeSpend({ tagId: rent.id, thisMonth: R(50000), trailing: [R(50000), R(50000), R(50000)] }),
    ])
    expect(strip.headlines).toEqual([])
    expect(strip.club).toBeUndefined()
    expect(strip.appreciations.map((a) => a.tagId), "₹-ranked wins").toEqual([food.id, dining.id])
  })

  it("says a plain calm month when nothing is material enough to appreciate", () => {
    const rent = makeTag({ id: "system-tag-rent", type: "Fixed", flow: "expense" })
    const food = makeTag({ id: "system-tag-food", type: "Everyday", flow: "expense" })
    const strip = engineWith([rent, food]).compose([
      makeSpend({ tagId: rent.id, thisMonth: R(50000), trailing: [R(50000), R(50000), R(50000)] }),
      makeSpend({ tagId: food.id, thisMonth: R(15100), trailing: [R(15000), R(15000), R(15000)] }),
    ])
    expect(strip.headlines).toEqual([])
    expect(strip.club).toBeUndefined()
    expect(strip.appreciations, "no victory lap over nothing").toEqual([])
  })
})

describe("internals — pure helpers", () => {
  const data = createFakeCalibrationData([FOOD])

  it("profileFor is total over the three strip types", () => {
    expect(profileFor("Fixed").gate).toBeGreaterThan(0)
    expect(profileFor("Metered").gate).toBeGreaterThan(0)
    expect(profileFor("Everyday").gate).toBeGreaterThan(0)
  })

  it("signalOf carries both deviation currencies and the adverse flag", () => {
    const signal = signalOf(
      makeSpend({ tagId: FOOD.id, thisMonth: R(23000), trailing: [R(15000), R(14000), R(16000)] }),
      data,
    )
    expect(signal, "Food is an unbudgeted ceiling with a baseline").toBeDefined()
    expect(signal?.deviationAmount).toBe(R(8000))
    expect(signal?.deviationFraction).toBeCloseTo(0.5333, 3)
    expect(signal?.adverse, "an over-run on a ceiling").toBe(true)
  })

  it("signalOf returns undefined for an unknown tag", () => {
    expect(signalOf(makeSpend({ tagId: "system-tag-nonexistent" }), data)).toBeUndefined()
  })

  it("signalOf returns undefined with no trailing history (nothing to baseline)", () => {
    const signal = signalOf(makeSpend({ tagId: FOOD.id, thisMonth: R(9000), trailing: [] }), data)
    expect(signal, "empty trailing → no median → §9 cold start").toBeUndefined()
  })

  it("signalOf returns undefined against a zero baseline (no meaningful ratio)", () => {
    const signal = signalOf(
      makeSpend({ tagId: FOOD.id, thisMonth: R(9000), trailing: [0, 0] }),
      data,
    )
    expect(signal, "median 0 → deviationFraction undefined → silent").toBeUndefined()
  })

  it("gateClass reads magnitude against a profile: headline / club / silent", () => {
    const profile = profileFor("Everyday")
    const signalAt = (thisMonth: number) => {
      const signal = signalOf(
        makeSpend({ tagId: FOOD.id, thisMonth, trailing: [R(10000), R(10000), R(10000)] }),
        data,
      )
      if (signal === undefined) throw new Error("expected a signal for a baselined ceiling")
      return signal
    }
    expect(gateClass(signalAt(R(20000)), profile), "+₹10k ≥ ₹5k headline").toBe("headline")
    expect(gateClass(signalAt(R(14000)), profile), "+₹4k ≥ floor & +40% ≥ gate").toBe("club")
    expect(gateClass(signalAt(R(10500)), profile), "+₹500 < ₹1k floor").toBe("silent")
  })
})
