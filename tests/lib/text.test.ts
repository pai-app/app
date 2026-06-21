import { describe, it, expect } from "vitest"
import { getInitials } from "@/lib/text"

describe("getInitials", () => {
  it("takes the first letter of the first two words by default", () => {
    expect(getInitials("John Doe")).toBe("JD")
  })

  it("collapses repeated whitespace before taking initials", () => {
    expect(getInitials("  multiple   spaces ")).toBe("MS")
  })

  it("honours a custom length", () => {
    expect(getInitials("john doe smith", 3)).toBe("JDS")
  })

  it("slices the name when there are fewer words than the length", () => {
    expect(getInitials("John")).toBe("JO")
  })

  it("uppercases a short single-word name padded to the length", () => {
    expect(getInitials("ab", 2)).toBe("AB")
  })
})
