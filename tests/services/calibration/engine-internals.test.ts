import { describe, it, expect } from "vitest"

import {
  comparisonOf,
  deviationFraction,
  flowDirection,
  hasEnoughTrailing,
  median,
  routeRule,
} from "@/services/calibration/engine-internals"
import { CALIBRATION } from "@/services/calibration/constants"

/**
 * Pure-helper tests for the calibration internals — the routing and arithmetic
 * that the §3 ladder is built from, tested in isolation from the engine class.
 */

describe("median", () => {
  it("is undefined for an empty series (cold start)", () => {
    expect(median([])).toBeUndefined()
  })

  it("returns the middle value for an odd count", () => {
    expect(median([16000, 14000, 15000])).toBe(15000)
  })

  it("averages the two middle values for an even count", () => {
    expect(median([10000, 20000, 30000, 40000])).toBe(25000)
  })

  it("resists a single lumpy month (why median, not mean)", () => {
    // One travel spike would drag a mean; the median holds at the typical value.
    expect(median([15000, 14000, 16000, 90000])).toBe(15500)
  })
})

describe("deviationFraction", () => {
  it("computes the canonical 15k-median → 23k case as +53%", () => {
    const dev = deviationFraction(23000, 15000)
    expect(dev).toBeCloseTo(0.5333, 3)
  })

  it("is negative when under the baseline", () => {
    expect(deviationFraction(8000, 10000)).toBeCloseTo(-0.2, 5)
  })

  it("is undefined against a zero baseline (no ratio)", () => {
    expect(deviationFraction(5000, 0)).toBeUndefined()
  })
})

describe("flowDirection", () => {
  it("maps target flow to a floor (more is better)", () => {
    expect(flowDirection("target")).toBe("floor")
  })

  it("maps expense and undefined to a ceiling", () => {
    expect(flowDirection("expense")).toBe("ceiling")
    expect(flowDirection(undefined)).toBe("ceiling")
  })

  it("maps excluded to a ceiling harmlessly (never reached — pre-gated)", () => {
    expect(flowDirection("excluded")).toBe("ceiling")
  })
})

describe("comparisonOf", () => {
  it("is above only past the positive threshold", () => {
    expect(comparisonOf(0.4, 0.35)).toBe("above")
    expect(comparisonOf(0.3, 0.35)).toBe("normal")
  })

  it("is below only past the negative threshold", () => {
    expect(comparisonOf(-0.4, 0.35)).toBe("below")
    expect(comparisonOf(-0.3, 0.35)).toBe("normal")
  })
})

describe("routeRule", () => {
  it("routes any budgeted tag to budgeted-direct regardless of type", () => {
    expect(routeRule("Everyday", true)).toBe("budgeted-direct")
    expect(routeRule("Occasional", true)).toBe("budgeted-direct")
    expect(routeRule(undefined, true)).toBe("budgeted-direct")
  })

  it("routes Fixed and Metered to committed (Rule 0)", () => {
    expect(routeRule("Fixed", false)).toBe("committed")
    expect(routeRule("Metered", false)).toBe("committed")
  })

  it("routes Everyday to frequent (Rule 3)", () => {
    expect(routeRule("Everyday", false)).toBe("frequent")
  })

  it("routes Occasional and unknown type to sporadic (Rule 4 — safe default)", () => {
    expect(routeRule("Occasional", false)).toBe("sporadic")
    expect(routeRule(undefined, false)).toBe("sporadic")
  })
})

describe("hasEnoughTrailing", () => {
  it("requires at least MIN_TRAILING months", () => {
    expect(hasEnoughTrailing([])).toBe(false)
    expect(hasEnoughTrailing(Array(CALIBRATION.MIN_TRAILING - 1).fill(1))).toBe(false)
    expect(hasEnoughTrailing(Array(CALIBRATION.MIN_TRAILING).fill(1))).toBe(true)
  })
})
