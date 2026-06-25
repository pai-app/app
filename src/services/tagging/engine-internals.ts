/**
 * Module-level pure helpers for the tagging engine.
 *
 * These are deterministic, side-effect-free functions and helper types lifted
 * out of `engine.ts` to keep each file under the house length limit. The
 * `TaggingEngine` class imports the exported helpers; the rest stay private to
 * this module.
 *
 * See `docs/tagging-engine-spec.md` §6, §7 and `docs/auto-tagging-design.md`
 * §4.1, §5, §7.
 */

import { TAGGING } from "./constants";
import { dice } from "./dice";
import { classify, isWeakSignature, strengthOf } from "./strength";

import type { TagRule } from "@/entities/tag-rule";
import type {
  MatchVerdict,
  RuleDelta,
  TaggingRule,
  TaggingTransaction,
} from "./types";

/**
 * A scored rule in contention to tag a transaction. `winner` is the rule's
 * argmax tag, `confidence = matchScore × majority`, and `evidence` is the
 * winner's combined strength (carried for tie-breaking, §7.6).
 */
export type Candidate = {
  readonly rule: TaggingRule;
  readonly winner: string;
  readonly confidence: number;
  readonly evidence: number;
};

/**
 * Scores one rule against the transaction. Returns `undefined` for an empty
 * rule (no winner). `matchScore` is `1.0` on a UPI-handle exact match, else the
 * fuzzy signature Dice; `confidence = matchScore × majority`. (§7.1 steps 2–5)
 */
export function scoreRule(
  rule: TaggingRule,
  txUpiId: string | undefined,
  txSignature: string,
): Candidate | undefined {
  const { winner, majority, evidence } = strengthOf(rule);
  if (winner === undefined) return undefined;

  const upiExact = Boolean(rule.upiId && txUpiId && rule.upiId === txUpiId);
  const matchScore = upiExact ? 1 : dice(txSignature, rule.signature ?? "");
  return { rule, winner, confidence: matchScore * majority, evidence };
}

/**
 * True when `a` should outrank `b`, applying the §7.6 tie-break in order:
 * highest confidence, then UPI-keyed over signature, then higher evidence,
 * then more recently matched.
 */
export function isBetterCandidate(a: Candidate, b: Candidate): boolean {
  if (a.confidence !== b.confidence) return a.confidence > b.confidence;
  const aIsUpi = Boolean(a.rule.upiId);
  const bIsUpi = Boolean(b.rule.upiId);
  if (aIsUpi !== bIsUpi) return aIsUpi;
  if (a.evidence !== b.evidence) return a.evidence > b.evidence;
  return a.rule.lastMatchedAt > b.rule.lastMatchedAt;
}

/**
 * Derives the verdict for the winning candidate strictly from the thresholds:
 * `auto` only when the rule is established, clears `AUTO_APPLY_THRESHOLD`, and
 * is not a weak signature (the cap is enforced HERE, not by callers); else
 * `suggest` when it clears `SUGGEST_THRESHOLD`; else `none`. (§7.1 step 5)
 */
export function verdictFor(candidate: Candidate, now: number): MatchVerdict {
  const { rule, winner, confidence } = candidate;

  const established = classify(rule, now) === "established";
  if (established && confidence >= TAGGING.AUTO_APPLY_THRESHOLD && !isWeakSignature(rule)) {
    return { kind: "auto", tagId: winner, confidence, rule };
  }
  if (confidence >= TAGGING.SUGGEST_THRESHOLD) {
    return { kind: "suggest", tagId: winner, confidence, rule };
  }
  return { kind: "none" };
}

/** Fields of an existing rule a mutation overrides; the rest are carried over. */
type RuleOverrides = {
  readonly votes?: Record<string, number>;
  readonly autoApplied?: Record<string, number>;
};

/**
 * Returns a NEW histogram with `tagId` adjusted by `delta`. Counts never go
 * below zero: when an entry reaches `<= 0` its key is removed entirely rather
 * than left at 0 or negative. The input object is never mutated.
 */
export function bump(hist: Record<string, number>, tagId: string, delta: number): Record<string, number> {
  const updated = (hist[tagId] ?? 0) + delta;
  const next: Record<string, number> = {};
  for (const [id, count] of Object.entries(hist)) {
    if (id !== tagId) next[id] = count;
  }
  if (updated > 0) next[tagId] = updated;
  return next;
}

/**
 * Builds the strengthened successor of an existing rule: applies the histogram
 * overrides, bumps `lastMatchedAt` to `now` (D1), and unions `tx`'s account and
 * (when given) the adapter into the provenance arrays. Immutable — `existing`
 * is untouched and `sampleNarration` is preserved.
 */
export function strengthen(
  existing: TaggingRule,
  overrides: RuleOverrides,
  tx: TaggingTransaction,
  adapterId: string | undefined,
  now: number,
): TagRule {
  return {
    ...existing,
    votes: overrides.votes ?? existing.votes,
    autoApplied: overrides.autoApplied ?? existing.autoApplied,
    sourceAccountIds: unionInto(existing.sourceAccountIds, tx.accountId),
    sourceAdapterIds: unionInto(existing.sourceAdapterIds, adapterId),
    lastMatchedAt: now,
  };
}

/**
 * Materialises a brand-new rule from a single tagging action (D3): one vote, an
 * empty `autoApplied`, `lastMatchedAt = now`, and provenance seeded from `tx`.
 * No back-fill from existing tagged transactions.
 */
export function materialise(
  key: string,
  upiId: string | undefined,
  signature: string,
  tagId: string,
  tx: TaggingTransaction,
  adapterId: string | undefined,
  now: number,
): TagRule {
  return {
    key,
    upiId,
    signature,
    votes: { [tagId]: 1 },
    autoApplied: {},
    sampleNarration: tx.narration,
    sourceAccountIds: [tx.accountId],
    sourceAdapterIds: adapterId ? [adapterId] : [],
    lastMatchedAt: now,
  };
}

/** Appends `value` to a provenance list unless it is absent or already present. */
function unionInto(list: readonly string[], value: string | undefined): readonly string[] {
  if (value === undefined || list.includes(value)) return list;
  return [...list, value];
}

/** Upserts the rule, or deletes it when its combined strength has hit zero. */
export function upsertOrDelete(rule: TagRule): RuleDelta {
  return strengthOf(rule).total <= 0 ? { op: "delete", key: rule.key } : { op: "upsert", rule };
}
