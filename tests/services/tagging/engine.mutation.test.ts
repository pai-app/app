import { describe, it, expect } from "vitest"

import { TaggingEngine } from "@/services/tagging/engine"

import { createFakeTaggingData, makeRule, makeTx } from "./fake-tagging-data"

import type { TagRule } from "@/services/entities/tag-rule"
import type { RuleDelta, TaggingRule, TaggingTransaction } from "@/services/tagging/types"

/**
 * Mutation tests — `applyHumanTag` / `applyAutoTag` / `applyRetag` outcomes per
 * `tagging-engine-spec.md` §7 and decisions D1 (lastMatchedAt bump), D3
 * (recurrence gate, no back-fill) and D8 (exact-key similar).
 */
const NOW = 1000
const NARRATION = "UPI-RAJESH@YBL"
const KEY = "upi:rajesh@ybl"

function engineWith(rules: readonly TaggingRule[], txs: readonly TaggingTransaction[] = []): TaggingEngine {
  return new TaggingEngine(createFakeTaggingData(rules, txs))
}

/** Narrows a delta to its upserted rule, failing the test otherwise. */
function upsertedRule(delta: RuleDelta): TagRule {
  if (delta.op !== "upsert") throw new Error(`expected upsert delta, got ${delta.op}`)
  return delta.rule
}

describe("applyHumanTag — recurrence gate (D3)", () => {
  it("emits no rule delta and no similar for a lone key", () => {
    const tx = makeTx({ id: "t1", narration: NARRATION })
    const outcome = engineWith([], [tx]).applyHumanTag(tx, "food", NOW)
    expect(outcome.patch).toEqual({ tagId: "food", autoTagged: false })
    expect(outcome.ruleDeltas).toEqual([])
    expect(outcome.similar).toBeUndefined()
  })

  it("materialises votes:{T:1} with provenance and similar when ≥2 share the key", () => {
    const tx = makeTx({ id: "t1", narration: NARRATION, accountId: "acc-1" })
    const sibling = makeTx({ id: "t2", narration: NARRATION })
    const outcome = engineWith([], [tx, sibling]).applyHumanTag(tx, "food", NOW, "hdfc")

    const rule = upsertedRule(outcome.ruleDeltas[0])
    expect(rule.key).toBe(KEY)
    expect(rule.votes).toEqual({ food: 1 })
    expect(rule.autoApplied).toEqual({})
    expect(rule.lastMatchedAt).toBe(NOW)
    expect(rule.sourceAccountIds).toEqual(["acc-1"])
    expect(rule.sourceAdapterIds).toEqual(["hdfc"])
    expect(outcome.similar).toEqual({ tagId: "food", transactionIds: ["t2"] })
  })
})

describe("applyHumanTag — provenance union (D1)", () => {
  it("adds a new account and adapter to an existing rule", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 2 }, sourceAccountIds: ["acc-1"], sourceAdapterIds: ["hdfc"] })
    const tx = makeTx({ narration: NARRATION, accountId: "acc-2" })
    const rule = upsertedRule(engineWith([existing]).applyHumanTag(tx, "food", NOW, "icici").ruleDeltas[0])
    expect(rule.votes).toEqual({ food: 3 })
    expect(rule.sourceAccountIds).toEqual(["acc-1", "acc-2"])
    expect(rule.sourceAdapterIds).toEqual(["hdfc", "icici"])
    expect(rule.lastMatchedAt).toBe(NOW)
  })

  it("dedupes an already-known account and adapter", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 2 }, sourceAccountIds: ["acc-1"], sourceAdapterIds: ["hdfc"] })
    const tx = makeTx({ narration: NARRATION, accountId: "acc-1" })
    const rule = upsertedRule(engineWith([existing]).applyHumanTag(tx, "food", NOW, "hdfc").ruleDeltas[0])
    expect(rule.sourceAccountIds).toEqual(["acc-1"])
    expect(rule.sourceAdapterIds).toEqual(["hdfc"])
  })
})

describe("applyAutoTag", () => {
  it("bumps autoApplied, marks the sparkle, and leaves votes intact", () => {
    const rule = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 2 } })
    const tx = makeTx({ narration: NARRATION })
    const outcome = engineWith([rule]).applyAutoTag(tx, { kind: "auto", tagId: "food", confidence: 1, rule }, NOW, "hdfc")
    expect(outcome.patch).toEqual({ tagId: "food", autoTagged: true })
    const next = upsertedRule(outcome.ruleDeltas[0])
    expect(next.autoApplied).toEqual({ food: 1 })
    expect(next.votes).toEqual({ food: 2 })
    expect(next.lastMatchedAt).toBe(NOW)
  })
})

describe("applyRetag", () => {
  it("moves a human vote A→B", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 3 } })
    const tx = makeTx({ narration: NARRATION, tagId: "food" })
    const outcome = engineWith([existing]).applyRetag(tx, "trip", false, NOW)
    expect(outcome.patch).toEqual({ tagId: "trip", autoTagged: false })
    expect(upsertedRule(outcome.ruleDeltas[0]).votes).toEqual({ food: 2, trip: 1 })
  })

  it("debits the human vote on untag", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 2 } })
    const tx = makeTx({ narration: NARRATION, tagId: "food" })
    const outcome = engineWith([existing]).applyRetag(tx, undefined, false, NOW)
    expect(outcome.patch).toEqual({ tagId: undefined, autoTagged: false })
    expect(upsertedRule(outcome.ruleDeltas[0]).votes).toEqual({ food: 1 })
  })

  it("corrects an auto-apply A→B: autoApplied[A]-1, votes[B]+1", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", autoApplied: { food: 1 } })
    const tx = makeTx({ narration: NARRATION, tagId: "food", autoTagged: true })
    const rule = upsertedRule(engineWith([existing]).applyRetag(tx, "trip", true, NOW).ruleDeltas[0])
    expect(rule.autoApplied).toEqual({})
    expect(rule.votes).toEqual({ trip: 1 })
  })

  it("emits a delete when combined strength reaches zero", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 1 } })
    const tx = makeTx({ narration: NARRATION, tagId: "food" })
    const outcome = engineWith([existing]).applyRetag(tx, undefined, false, NOW)
    expect(outcome.ruleDeltas).toEqual([{ op: "delete", key: KEY }])
  })

  it("is a no-op on the rules when no rule exists for the key", () => {
    const tx = makeTx({ narration: NARRATION, tagId: "food" })
    expect(engineWith([]).applyRetag(tx, "trip", false, NOW).ruleDeltas).toEqual([])
  })
})
