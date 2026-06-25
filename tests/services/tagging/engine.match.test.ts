import { describe, it, expect } from "vitest"

import { TAGGING } from "@/services/tagging/constants"
import { TaggingEngine } from "@/services/tagging/engine"

import { createFakeTaggingData, makeRule, makeTx } from "./fake-tagging-data"

import type { TaggingRule } from "@/services/tagging/types"

/**
 * Matching tests — `matchTransaction` verdicts per `auto-tagging-design.md` §7.5:
 * UPI-exact auto, fuzzy suggest, below-threshold none, the UPI tie-break, the
 * Food→Trip no-flip case, and the weak-signature cap. `now === 0` keeps rules
 * fresh (non-dormant).
 */
const FRESH = 0

function engineOver(rules: readonly TaggingRule[]): TaggingEngine {
  return new TaggingEngine(createFakeTaggingData(rules))
}

describe("matchTransaction", () => {
  it("returns none when there are no rules", () => {
    const verdict = engineOver([]).matchTransaction(makeTx({ narration: "UPI-RAJESH@YBL" }), FRESH)
    expect(verdict.kind).toBe("none")
  })

  it("auto-applies an established UPI-exact rule (confidence 1.0)", () => {
    const rule = makeRule({ key: "upi:rajesh@ybl", upiId: "rajesh@ybl", votes: { food: 2 } })
    const verdict = engineOver([rule]).matchTransaction(
      makeTx({ narration: "UPI-RAJESH@YBL-REF120555" }),
      FRESH,
    )
    expect(verdict).toMatchObject({ kind: "auto", tagId: "food" })
    if (verdict.kind !== "none") expect(verdict.confidence).toBeCloseTo(1, 5)
  })

  it("only suggests on a fuzzy signature match", () => {
    const rule = makeRule({ signature: "alpha bravo charlie", votes: { food: 5 } })
    const verdict = engineOver([rule]).matchTransaction(
      makeTx({ narration: "ALPHA BRAVO DELTA" }),
      FRESH,
    )
    expect(verdict.kind).toBe("suggest")
    if (verdict.kind !== "none") {
      expect(verdict.tagId).toBe("food")
      expect(verdict.confidence).toBeGreaterThanOrEqual(TAGGING.SUGGEST_THRESHOLD)
      expect(verdict.confidence).toBeLessThan(TAGGING.AUTO_APPLY_THRESHOLD)
    }
  })

  it("returns none for a split rule below the majority/confidence floor", () => {
    const rule = makeRule({ key: "upi:rajesh@ybl", upiId: "rajesh@ybl", votes: { food: 6, trip: 5 } })
    const verdict = engineOver([rule]).matchTransaction(
      makeTx({ narration: "UPI-RAJESH@YBL" }),
      FRESH,
    )
    expect(verdict.kind).toBe("none")
  })

  it("breaks a confidence tie in favour of the UPI-keyed rule", () => {
    const upiRule = makeRule({ key: "upi:rajesh@ybl", upiId: "rajesh@ybl", votes: { food: 3 } })
    const sigRule = makeRule({ key: "sig:food-swiggy", signature: "food swiggy", votes: { trip: 3 } })
    // tx carries BOTH the handle (→ upiRule exact 1.0) and the exact signature
    // (→ sigRule dice 1.0); confidences tie at 1.0, so the UPI rule must win.
    const tx = makeTx({ narration: "RAJESH@YBL SWIGGY FOOD" })
    const verdict = engineOver([sigRule, upiRule]).matchTransaction(tx, FRESH)
    expect(verdict).toMatchObject({ kind: "auto", tagId: "food" })
    if (verdict.kind !== "none") expect(verdict.rule.key).toBe("upi:rajesh@ybl")
  })

  it("ignores a rule with no winning tag (empty votes)", () => {
    const rule = makeRule({ key: "upi:rajesh@ybl", upiId: "rajesh@ybl", votes: {} })
    const verdict = engineOver([rule]).matchTransaction(makeTx({ narration: "UPI-RAJESH@YBL" }), FRESH)
    expect(verdict.kind).toBe("none")
  })

  it("keeps the stronger earlier candidate when a later rule scores lower", () => {
    const upiRule = makeRule({ key: "upi:rajesh@ybl", upiId: "rajesh@ybl", votes: { food: 3 } })
    const sigRule = makeRule({ key: "sig:weak", signature: "swiggy zomato dinner cafe", votes: { trip: 3 } })
    // tx carries the UPI handle (→ upiRule exact 1.0) plus only a partial of the
    // signature (→ sigRule dice < 1.0); the earlier, stronger UPI rule must win.
    const tx = makeTx({ narration: "RAJESH@YBL SWIGGY" })
    const verdict = engineOver([upiRule, sigRule]).matchTransaction(tx, FRESH)
    expect(verdict).toMatchObject({ kind: "auto", tagId: "food" })
  })

  it("keeps Food after 6 Trip corrections — large autoApplied holds the majority", () => {
    const rule = makeRule({
      key: "upi:rajesh@ybl",
      upiId: "rajesh@ybl",
      votes: { food: 4, trip: 6 },
      autoApplied: { food: 133 },
    })
    const verdict = engineOver([rule]).matchTransaction(
      makeTx({ narration: "UPI-RAJESH@YBL" }),
      FRESH,
    )
    expect(verdict).toMatchObject({ kind: "auto", tagId: "food" })
    if (verdict.kind !== "none") expect(verdict.confidence).toBeCloseTo(0.958, 3)
  })

  it("caps a would-be-auto weak signature rule to suggest", () => {
    // Exact signature (dice 1.0), established, majority 1.0 — auto on the numbers,
    // but the single-token signature trips the weak cap, so it can only suggest.
    const rule = makeRule({ key: "sig:swiggy", signature: "swiggy", votes: { food: 3 } })
    const verdict = engineOver([rule]).matchTransaction(makeTx({ narration: "SWIGGY" }), FRESH)
    expect(verdict).toMatchObject({ kind: "suggest", tagId: "food" })
  })
})
