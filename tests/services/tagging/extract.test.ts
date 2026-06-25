import { describe, it, expect } from "vitest"

import { buildSignature, extractUpiId, keyOf } from "@/services/tagging/extract"

/**
 * Extraction tests — reproduce the `auto-tagging-design.md` §6.3 worked-extraction
 * table exactly, plus the §6.1 spaced-handle wrinkle and the sort/dedupe contract.
 */
describe("extractUpiId", () => {
  it("collapses the single space PDF extraction injects after `@`", () => {
    expect(extractUpiId("UPI-PRIYA SHARMA MEHRA-PRIYAMEHRA@ OKHDFCBANK-FDRL0007778-UPI")).toBe(
      "priyamehra@okhdfcbank",
    )
  })

  it("lowercases a plain handle", () => {
    expect(extractUpiId("UPI-RAJESH KUMAR-9812345678@YBL-HDFC 0000314-UPI")).toBe("9812345678@ybl")
  })

  it("keeps a dotted local part and the collapsed space", () => {
    expect(extractUpiId("UPI-ZERODHA BROKING LTD-ZERODHA.PAYU@ AXISBANK-UPIINT ENT")).toBe(
      "zerodha.payu@axisbank",
    )
  })

  it("returns undefined when there is no handle", () => {
    expect(extractUpiId("NEFT CR-CITI0000004-GLOBEX-1608-SALARY PA YMENT-JOHN DOE")).toBeUndefined()
  })
})

describe("buildSignature", () => {
  it("strips the handle, numbers and noise then sorts the §6.3 priya row", () => {
    expect(
      buildSignature(
        "UPI-PRIYA SHARMA MEHRA-PRIYAMEHRA@ OKHDFCBANK-FDRL0007778-121088800012-UPI Value Dt 04/04/2026 Ref 121088800012",
      ),
    ).toBe("mehra priya sharma")
  })

  it("reproduces the salary cross-ref row (keeps identity words, drops `pa` noise)", () => {
    expect(
      buildSignature(
        "NEFT CR-CITI0000004-GLOBEX-1608-SALARY PA YMENT-JOHN DOE-CITIN26600012345 Value Dt 16/04/2026",
      ),
    ).toBe("cr doe globex john salary yment")
  })

  it("collapses monthly salary suffixes (`FOR MAY/APR 2026`) to one signature", () => {
    const base =
      "NEFT Cr-CITI0000004-GLOBEX-1608-SALARY PAYMENT-John Doe-CITIN26653424074 Value Dt 16/04/2026 Ref CITIN26653424074"
    const may =
      "NEFT Cr-CITI0000004-GLOBEX-1608-SALARY PAYMENT-John Doe-CITIN26674671128 SALARY PAYMENT FOR MAY 2026 Value Dt 28/05/2026 Ref CITIN26674671128"
    const apr =
      "NEFT Cr-CITI0000004-GLOBEX-1608-SALARY PAYMENT-John Doe-CITIN26658453490 SALARY PAYMENT FOR APR 2026 Value Dt 28/04/2026 Ref CITIN26658453490"
    const sig = buildSignature(base)
    expect(sig).toBe("cr doe globex john salary")
    expect(buildSignature(may)).toBe(sig)
    expect(buildSignature(apr)).toBe(sig)
  })

  it("reproduces the zerodha handle row", () => {
    expect(buildSignature("UPI-ZERODHA BROKING LTD-ZERODHA.PAYU@ AXISBANK-UPIINT ENT")).toBe(
      "broking ent ltd zerodha",
    )
  })

  it.each([
    ["SWIGGY FOOD ORDER", "food order swiggy"],
    ["AMAZON INDIA MARKETPLACE", "amazon india marketplace"],
    ["Sent to: Rajesh Kumar UPI Ref: 120555000001", "kumar rajesh sent to"],
  ])("reproduces §6.3 row %s", (narration, signature) => {
    expect(buildSignature(narration)).toBe(signature)
  })

  it("is order-independent: shuffled tokens yield the same signature", () => {
    expect(buildSignature("ORDER FOOD SWIGGY")).toBe(buildSignature("SWIGGY FOOD ORDER"))
  })

  it("dedupes repeated tokens", () => {
    expect(buildSignature("SWIGGY SWIGGY FOOD")).toBe("food swiggy")
  })
})

describe("keyOf", () => {
  it("prefers a `upi:` key when a handle exists", () => {
    expect(keyOf("priyamehra@okhdfcbank", "mehra priya sharma")).toBe("upi:priyamehra@okhdfcbank")
  })

  it("sanitises dots out of the key (fyre-db id separator)", () => {
    const key = keyOf("zerodha.payu@axisbank", "broking zerodha")
    expect(key).toBe("upi:zerodha_payu@axisbank")
    expect(key).not.toContain(".")
  })

  it("falls back to a `sig:` key when there is no handle", () => {
    expect(keyOf(undefined, "broking zerodha")).toMatch(/^sig:/)
  })

  it("is deterministic for the same signature", () => {
    expect(keyOf(undefined, "broking zerodha")).toBe(keyOf(undefined, "broking zerodha"))
  })

  it("produces distinct keys for distinct signatures", () => {
    expect(keyOf(undefined, "broking zerodha")).not.toBe(keyOf(undefined, "food order swiggy"))
  })

  it("treats an omitted signature as the empty signature", () => {
    expect(keyOf(undefined, undefined)).toBe(keyOf(undefined, ""))
  })
})
