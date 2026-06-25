import { describe, it, expect } from "vitest"

import { TAGGING } from "@/services/tagging/constants"
import { classify, isDormant, isWeakSignature, strengthOf } from "@/services/tagging/strength"

import { makeRule } from "./fake-tagging-data"

/**
 * Strength & classification tests — the `auto-tagging-design.md` §7.3 evidence /
 * majority gate table, the weak-signature cap, and the dormancy behaviour
 * (`tagging-engine-spec.md` §5). `now === lastMatchedAt` keeps rules non-dormant.
 */
const FRESH = 0

describe("strengthOf", () => {
  it("sums votes and autoApplied per tag and picks the argmax winner", () => {
    const result = strengthOf(makeRule({ votes: { food: 4, trip: 6 }, autoApplied: { food: 133 } }))
    expect(result.winner).toBe("food")
    expect(result.evidence).toBe(137)
    expect(result.total).toBe(143)
    expect(result.majority).toBeCloseTo(0.958, 3)
  })

  it("reports a zero summary for an empty rule", () => {
    const result = strengthOf(makeRule())
    expect(result.winner).toBeUndefined()
    expect(result.evidence).toBe(0)
    expect(result.majority).toBe(0)
    expect(result.total).toBe(0)
  })

  it("sums an auto-applied tag that has no human votes", () => {
    const result = strengthOf(makeRule({ votes: { food: 2 }, autoApplied: { trip: 5 } }))
    expect(result.winner).toBe("trip") // 5 > 2
    expect(result.total).toBe(7)
  })
})

describe("classify (§7.3 gate table)", () => {
  it.each([
    [{ food: 2 }, {}, "established"],
    [{ food: 1 }, {}, "provisional"], // evidence < MIN_EVIDENCE
    [{ food: 4 }, { food: 139 }, "established"],
    [{ food: 4, trip: 6 }, { food: 133 }, "established"],
    [{ food: 6, trip: 5 }, {}, "provisional"], // majority 0.55 < MIN_MAJORITY
  ] as const)("classifies votes=%o auto=%o as %s", (votes, autoApplied, expected) => {
    expect(classify(makeRule({ votes, autoApplied }), FRESH)).toBe(expected)
  })
})

describe("isWeakSignature (cap)", () => {
  it("flags a single-token signature rule as weak", () => {
    expect(isWeakSignature(makeRule({ signature: "swiggy" }))).toBe(true)
  })

  it("flags a too-short two-token signature rule as weak", () => {
    expect(isWeakSignature(makeRule({ signature: "a b" }))).toBe(true)
  })

  it("does not flag a sufficiently rich signature rule", () => {
    expect(isWeakSignature(makeRule({ signature: "food order" }))).toBe(false)
  })

  it("never flags a UPI-keyed rule, even with no signature", () => {
    expect(isWeakSignature(makeRule({ upiId: "rajesh@ybl", key: "upi:rajesh@ybl" }))).toBe(false)
  })

  it("flags a rule with no signature at all as weak", () => {
    expect(isWeakSignature(makeRule())).toBe(true)
  })
})

describe("isDormant", () => {
  it("is false exactly at the dormancy window boundary", () => {
    expect(isDormant(makeRule({ lastMatchedAt: 0 }), TAGGING.DORMANT_AFTER_MS)).toBe(false)
  })

  it("is true once past the dormancy window", () => {
    expect(isDormant(makeRule({ lastMatchedAt: 0 }), TAGGING.DORMANT_AFTER_MS + 1)).toBe(true)
  })

  it("demotes an otherwise-established rule to provisional when dormant", () => {
    const rule = makeRule({ votes: { food: 10 }, lastMatchedAt: 0 })
    expect(classify(rule, FRESH)).toBe("established")
    expect(classify(rule, TAGGING.DORMANT_AFTER_MS + 1)).toBe("provisional")
  })
})
