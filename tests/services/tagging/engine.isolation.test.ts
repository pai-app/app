import { describe, it, expect } from "vitest"

import { TaggingEngine } from "@/services/tagging/engine"

import { createFakeTaggingData, makeRule, makeTx } from "./fake-tagging-data"

/**
 * Tenant isolation — two engines over two separate fake ports never observe each
 * other's rules (`tagging-engine-spec.md` §10). The engine holds no state beyond
 * its injected port, so each tenant's data stays private.
 */
describe("tenant isolation", () => {
  const tx = makeTx({ narration: "UPI-RAJESH@YBL" })

  function makeEngines() {
    const ruleA = makeRule({ key: "upi:rajesh@ybl", upiId: "rajesh@ybl", votes: { food: 2 } })
    const engineA = new TaggingEngine(createFakeTaggingData([ruleA]))
    const engineB = new TaggingEngine(createFakeTaggingData([]))
    return { engineA, engineB }
  }

  it("engine A matches its own rule while engine B sees nothing", () => {
    const { engineA, engineB } = makeEngines()
    expect(engineA.matchTransaction(tx, 0)).toMatchObject({ kind: "auto", tagId: "food" })
    expect(engineB.matchTransaction(tx, 0).kind).toBe("none")
  })

  it("a tag action computed against one port never leaks into the other", () => {
    const { engineA, engineB } = makeEngines()
    // Engine A computes a vote bump on its rule; engine B's port is untouched and
    // still has no rule for the key, so a retag there is a no-op.
    expect(engineA.applyRetag(makeTx({ narration: "UPI-RAJESH@YBL", tagId: "food" }), "trip", false, 0).ruleDeltas).toHaveLength(1)
    expect(engineB.applyRetag(makeTx({ narration: "UPI-RAJESH@YBL", tagId: "food" }), "trip", false, 0).ruleDeltas).toEqual([])
  })
})
