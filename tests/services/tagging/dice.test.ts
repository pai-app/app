import { describe, it, expect } from "vitest"

import { dice } from "@/services/tagging/dice"

/**
 * Dice tests — the canonical bigram coefficient values plus the documented
 * empty/short-string edge cases (`tagging-engine-spec.md` §4, dice.ts contract).
 */
describe("dice", () => {
  it("scores the textbook night/nacht pair at 0.25", () => {
    // bigrams: {ni,ig,gh,ht} vs {na,ac,ch,ht} share only `ht` → 2*1/(4+4).
    expect(dice("night", "nacht")).toBeCloseTo(0.25, 5)
  })

  it("scores identical strings as 1", () => {
    expect(dice("swiggy", "swiggy")).toBe(1)
  })

  it("scores fully disjoint strings as 0", () => {
    expect(dice("abc", "xyz")).toBe(0)
  })

  it("stays within 0..1 for a partial overlap", () => {
    const score = dice("amazon", "amazonin")
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })

  it("is symmetric", () => {
    expect(dice("food order", "order food")).toBe(dice("order food", "food order"))
  })

  it("treats two empty strings as identical (1)", () => {
    expect(dice("", "")).toBe(1)
  })

  it("treats two distinct sub-bigram strings as disjoint (0)", () => {
    expect(dice("a", "b")).toBe(0)
  })

  it("treats one empty and one non-empty string as disjoint (0)", () => {
    expect(dice("ab", "")).toBe(0)
  })

  it("treats equal single-character strings as identical (1)", () => {
    expect(dice("a", "a")).toBe(1)
  })
})
