import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("joins truthy class values", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("drops falsy conditionals", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b")
  })

  it("merges conflicting tailwind utilities (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("flattens array inputs", () => {
    expect(cn(["a", false, "b"])).toBe("a b")
  })
})
