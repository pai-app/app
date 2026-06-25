import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { sessionSlot, localSlot, xorTransform, getOrCreateDeviceId } from "@/providers/web-storage"

class Mem {
  private m = new Map<string, string>()
  getItem(k: string): string | null { return this.m.get(k) ?? null }
  setItem(k: string, v: string): void { this.m.set(k, v) }
  removeItem(k: string): void { this.m.delete(k) }
  clear(): void { this.m.clear() }
}

describe("web-storage", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", new Mem())
    vi.stubGlobal("localStorage", new Mem())
  })
  afterEach(() => { vi.unstubAllGlobals() })

  describe("sessionSlot / localSlot", () => {
    it("round-trips a value and clears it", () => {
      const slot = sessionSlot("k")
      expect(slot.get()).toBeNull()
      slot.set("hello")
      expect(slot.get()).toBe("hello")
      expect(sessionStorage.getItem("k")).toBe("hello")
      slot.clear()
      expect(slot.get()).toBeNull()
    })

    it("localSlot is backed by localStorage", () => {
      const slot = localSlot("d")
      slot.set("v")
      expect(localStorage.getItem("d")).toBe("v")
    })

    it("applies a transform on the way in and out (raw is obfuscated)", () => {
      const slot = sessionSlot("t", xorTransform("secret"))
      slot.set("plaintext")
      const raw = sessionStorage.getItem("t")
      expect(raw).not.toBeNull()
      expect(raw).not.toBe("plaintext")
      expect(slot.get()).toBe("plaintext")
    })

    it("returns null / no-ops when the storage area is unavailable", () => {
      vi.stubGlobal("sessionStorage", undefined)
      const slot = sessionSlot("x")
      expect(slot.get()).toBeNull()
      expect(() => { slot.set("v") }).not.toThrow()
      expect(() => { slot.clear() }).not.toThrow()
    })

    it("swallows errors thrown by the storage area", () => {
      const throwing = {
        getItem: () => { throw new Error("boom") },
        setItem: () => { throw new Error("boom") },
        removeItem: () => { throw new Error("boom") },
      }
      vi.stubGlobal("sessionStorage", throwing)
      const slot = sessionSlot("e")
      expect(slot.get()).toBeNull()
      expect(() => { slot.set("v") }).not.toThrow()
      expect(() => { slot.clear() }).not.toThrow()
    })
  })

  describe("xorTransform", () => {
    it("encode/decode round-trips", () => {
      const t = xorTransform("k3y")
      expect(t.decode(t.encode('{"tenantId":"abc","credential":"pw-123"}'))).toBe('{"tenantId":"abc","credential":"pw-123"}')
    })
  })

  describe("getOrCreateDeviceId", () => {
    it("creates + persists a new id, then returns it on subsequent reads", () => {
      const id1 = getOrCreateDeviceId("dev")
      expect(id1).toBeTruthy()
      expect(localStorage.getItem("dev")).toBe(id1)
      expect(getOrCreateDeviceId("dev")).toBe(id1)
    })
  })
})
