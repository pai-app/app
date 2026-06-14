import { describe, it, expect } from "vitest"
import { BANK_CATALOG } from "@pai-app/adapters"
import { ICON_TO_PACK } from "@/lib/icons/generated"
import { BANK_DISPLAY, KIND_DISPLAY } from "@/services/catalog/bank-display"

/**
 * These tests pin `BANK_DISPLAY` to the package's `BANK_CATALOG` so the two
 * can never drift: nothing missing, nothing extra, at both the bank and
 * offering level. If adapters adds/removes a bank or offering, the relevant
 * assertion fails until `BANK_DISPLAY` is updated to match.
 */
describe("BANK_DISPLAY ↔ adapters BANK_CATALOG parity", () => {
  it("covers exactly the package's bank ids (none missing, none extra)", () => {
    expect(Object.keys(BANK_DISPLAY).sort()).toEqual(
      BANK_CATALOG.map((b) => b.bankId).sort(),
    )
  })

  it("covers exactly each bank's offering ids (none missing, none extra)", () => {
    for (const entry of BANK_CATALOG) {
      const display = BANK_DISPLAY[entry.bankId]
      expect(display, `missing bank display: ${entry.bankId}`).toBeDefined()
      expect(Object.keys(display.offerings).sort()).toEqual(
        entry.offerings.map((o) => o.offeringId).sort(),
      )
    }
  })

  it("has no display entry referencing a bank/offering the package doesn't define", () => {
    const catalogBankIds = new Set(BANK_CATALOG.map((b) => b.bankId))
    for (const [bankId, display] of Object.entries(BANK_DISPLAY)) {
      expect(catalogBankIds.has(bankId), `extra bank display: ${bankId}`).toBe(true)
      const offeringIds = new Set(
        BANK_CATALOG.find((b) => b.bankId === bankId)?.offerings.map((o) => o.offeringId),
      )
      for (const offeringId of Object.keys(display.offerings)) {
        expect(
          offeringIds.has(offeringId),
          `extra offering display: ${bankId}/${offeringId}`,
        ).toBe(true)
      }
    }
  })

  it("gives every bank a non-empty label and icon, and every offering a label", () => {
    for (const [bankId, display] of Object.entries(BANK_DISPLAY)) {
      expect(display.label.length, `${bankId} label`).toBeGreaterThan(0)
      expect(display.icon.length, `${bankId} icon`).toBeGreaterThan(0)
      for (const [offeringId, offering] of Object.entries(display.offerings)) {
        expect(offering.label.length, `${bankId}/${offeringId} label`).toBeGreaterThan(0)
      }
    }
  })

  it("references only icon keys that exist in the icon registry", () => {
    for (const [bankId, display] of Object.entries(BANK_DISPLAY)) {
      expect(ICON_TO_PACK[display.icon], `bank icon ${display.icon} (${bankId})`).toBeDefined()
      for (const [offeringId, offering] of Object.entries(display.offerings)) {
        if (offering.icon !== undefined) {
          expect(
            ICON_TO_PACK[offering.icon],
            `offering icon ${offering.icon} (${bankId}/${offeringId})`,
          ).toBeDefined()
        }
      }
    }
  })
})

describe("KIND_DISPLAY", () => {
  it("gives every account kind a non-empty label and a registered icon", () => {
    for (const [kind, display] of Object.entries(KIND_DISPLAY)) {
      expect(display.label.length, `${kind} label`).toBeGreaterThan(0)
      expect(display.icon.length, `${kind} icon`).toBeGreaterThan(0)
      expect(ICON_TO_PACK[display.icon], `kind icon ${display.icon} (${kind})`).toBeDefined()
    }
  })
})
