import { describe, it, expect } from "vitest"
import { resolveDisplay, resolveKind } from "@/services/notifications/registry"

describe("notifications registry", () => {
  it("resolves a known display key to its preset", () => {
    expect(resolveDisplay("info")).toBeDefined()
    expect(resolveDisplay("error")).toBeDefined()
  })

  it("falls back to the info preset for an unknown display key", () => {
    expect(resolveDisplay("does-not-exist")).toEqual(resolveDisplay("info"))
  })

  it("resolves a known kind to its delivery policy", () => {
    expect(resolveKind("import-error").channels).toContain("inbox")
  })

  it("falls back to inbox-only for an unknown kind", () => {
    expect(resolveKind("does-not-exist").channels).toEqual(["inbox"])
  })
})
