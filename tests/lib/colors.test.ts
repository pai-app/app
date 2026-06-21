import { describe, it, expect } from "vitest"
import { PALETTE, getColor } from "@/lib/colors"

describe("getColor", () => {
  it("always returns a palette entry", () => {
    expect(PALETTE).toContain(getColor("some-key"))
    expect(PALETTE).toContain(getColor("another"))
  })

  it("is deterministic for the same key", () => {
    expect(getColor("zomato")).toBe(getColor("zomato"))
  })

  it("maps the empty string (hash 0) to the first palette colour", () => {
    expect(getColor("")).toBe(PALETTE[0])
  })

  it("distributes different keys across the palette", () => {
    const colors = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => PALETTE.indexOf(getColor(k))),
    )
    expect(colors.size).toBeGreaterThan(1)
  })
})
