import { describe, it, expect } from "vitest"

import { TaggingEngine } from "@/services/tagging/engine"
import { buildSignature } from "@/services/tagging/extract"

import { createFakeTaggingData, keyForNarration, makeRule, makeTx } from "./fake-tagging-data"

import type { TagRule } from "@/services/entities/tag-rule"
import type { RuleDelta, TaggingRule, TaggingTransaction } from "@/services/tagging/types"

/**
 * Bulk / lookup / removal coverage for `TaggingEngine`: `matchMany`,
 * `findSimilarUntagged`, `applyTransactionRemoved`, and the §7.6 candidate
 * tie-break (evidence, then `lastMatchedAt`) reached through `matchTransaction`.
 */
const NOW = 0
const NARRATION = "UPI-RAJESH@YBL"
const KEY = "upi:rajesh@ybl"

function engineWith(rules: readonly TaggingRule[], txs: readonly TaggingTransaction[] = []): TaggingEngine {
  return new TaggingEngine(createFakeTaggingData(rules, txs))
}

function upsertedRule(delta: RuleDelta): TagRule {
  if (delta.op !== "upsert") throw new Error(`expected upsert delta, got ${delta.op}`)
  return delta.rule
}

describe("matchMany", () => {
  it("returns a verdict per transaction, keyed by id", () => {
    const rule = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 2 } })
    const match = makeTx({ id: "t1", narration: NARRATION })
    const miss = makeTx({ id: "t2", narration: "RANDOM NARRATION" })

    const verdicts = engineWith([rule]).matchMany([match, miss], NOW)

    expect(verdicts.size).toBe(2)
    expect(verdicts.get("t1")).toMatchObject({ kind: "auto", tagId: "food" })
    expect(verdicts.get("t2")?.kind).toBe("none")
  })

  it("is an empty map for no transactions", () => {
    expect(engineWith([]).matchMany([], NOW).size).toBe(0)
  })
})

describe("findSimilarUntagged", () => {
  it("returns ids of untagged rows sharing the key, in port order", () => {
    const key = keyForNarration(NARRATION)
    const untaggedA = makeTx({ id: "a", narration: NARRATION })
    const tagged = makeTx({ id: "b", narration: NARRATION, tagId: "food" })
    const untaggedB = makeTx({ id: "c", narration: NARRATION })
    const other = makeTx({ id: "d", narration: "SOMETHING ELSE" })

    const ids = engineWith([], [untaggedA, tagged, untaggedB, other]).findSimilarUntagged(key)

    expect(ids).toEqual(["a", "c"])
  })

  it("returns an empty array when nothing shares the key", () => {
    expect(engineWith([], []).findSimilarUntagged("upi:nobody@ybl")).toEqual([])
  })
})

describe("applyTransactionRemoved", () => {
  it("debits a human vote and keeps a rule with residual strength", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 2 } })
    const tx = makeTx({ narration: NARRATION, tagId: "food" })

    const outcome = engineWith([existing]).applyTransactionRemoved(tx)

    expect(outcome.patch).toEqual({})
    expect(upsertedRule(outcome.ruleDeltas[0]).votes).toEqual({ food: 1 })
  })

  it("debits the autoApplied histogram when the row was auto-tagged", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 2 }, autoApplied: { food: 1 } })
    const tx = makeTx({ narration: NARRATION, tagId: "food", autoTagged: true })

    const rule = upsertedRule(engineWith([existing]).applyTransactionRemoved(tx).ruleDeltas[0])

    expect(rule.autoApplied).toEqual({})
    expect(rule.votes).toEqual({ food: 2 })
  })

  it("does not bump lastMatchedAt (removal is not a match)", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 2 }, lastMatchedAt: 42 })
    const tx = makeTx({ narration: NARRATION, tagId: "food" })

    expect(upsertedRule(engineWith([existing]).applyTransactionRemoved(tx).ruleDeltas[0]).lastMatchedAt).toBe(42)
  })

  it("emits a delete when the last contribution is removed", () => {
    const existing = makeRule({ key: KEY, upiId: "rajesh@ybl", votes: { food: 1 } })
    const tx = makeTx({ narration: NARRATION, tagId: "food" })

    expect(engineWith([existing]).applyTransactionRemoved(tx).ruleDeltas).toEqual([{ op: "delete", key: KEY }])
  })

  it("is a no-op on the rules when the row is untagged or has no rule", () => {
    const untagged = makeTx({ narration: NARRATION })
    expect(engineWith([makeRule({ key: KEY, votes: { food: 1 } })]).applyTransactionRemoved(untagged).ruleDeltas).toEqual([])

    const tagged = makeTx({ narration: NARRATION, tagId: "food" })
    expect(engineWith([]).applyTransactionRemoved(tagged).ruleDeltas).toEqual([])
  })
})

describe("candidate tie-break (§7.6)", () => {
  const SIG_NARRATION = "ALPHA BRAVO"
  const signature = buildSignature(SIG_NARRATION)

  it("prefers the higher-evidence rule when confidence ties", () => {
    // Both signature rules match exactly (dice 1.0, majority 1.0 → confidence 1.0
    // each) and are non-UPI, so the winner is decided on evidence: 5 > 3.
    const lo = makeRule({ key: "sig:lo", signature, votes: { food: 3 } })
    const hi = makeRule({ key: "sig:hi", signature, votes: { trip: 5 } })
    const verdict = engineWith([lo, hi]).matchTransaction(makeTx({ narration: SIG_NARRATION }), NOW)
    expect(verdict).toMatchObject({ kind: "auto", tagId: "trip" })
  })

  it("falls through to lastMatchedAt when confidence and evidence tie", () => {
    // Identical confidence (1.0) and evidence (2); the more recently matched rule wins.
    const older = makeRule({ key: "sig:old", signature, votes: { food: 2 }, lastMatchedAt: 100 })
    const newer = makeRule({ key: "sig:new", signature, votes: { trip: 2 }, lastMatchedAt: 200 })
    const verdict = engineWith([older, newer]).matchTransaction(makeTx({ narration: SIG_NARRATION }), NOW)
    expect(verdict).toMatchObject({ kind: "auto", tagId: "trip" })
  })
})
