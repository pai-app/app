/**
 * Pure strength & classification for the tagging engine.
 *
 * Deterministic and side-effect free: no I/O, no clock (injected via `now`),
 * no randomness, no module-level mutable state. All math is over a tag's
 * COMBINED strength `strength(t) = votes[t] + autoApplied[t]`, and every
 * threshold reads from the shared `TAGGING` tuning object.
 *
 * See `docs/tagging-engine-spec.md` §5 and `docs/auto-tagging-design.md` §7.3.
 */

import { TAGGING } from "./constants";

import type { TagRule } from "../entities/tag-rule";

type Strength = {
  readonly winner?: string;
  readonly evidence: number;
  readonly majority: number;
  readonly total: number;
};

/**
 * Computes a rule's combined-strength summary: the winning tag (argmax), its
 * evidence, the total strength across all tags, and the winner's majority share.
 *
 * `winner` is `undefined` and `evidence`/`majority` are 0 when total is 0.
 * Ties are broken deterministically by ascending `tagId`, so results are stable.
 */
export function strengthOf(rule: TagRule): Strength {
  const combined = combinedStrengths(rule);

  let total = 0;
  let winner: string | undefined;
  let evidence = 0;

  // Iterate tagIds in ascending order so a strength tie deterministically
  // resolves to the first tagId rather than depending on insertion order.
  for (const tagId of Object.keys(combined).sort()) {
    const strength = combined[tagId];
    total += strength;
    if (strength > evidence) {
      evidence = strength;
      winner = tagId;
    }
  }

  // `majority` is 0 when total is 0 to avoid a divide-by-zero.
  const majority = total === 0 ? 0 : evidence / total;
  return { winner, evidence, majority, total };
}

/**
 * True only for signature-keyed rules whose signature is too thin to trust —
 * below `MIN_SIGNATURE_TOKENS` tokens (split on spaces) or `MIN_SIGNATURE_CHARS`
 * characters. UPI-keyed rules (those carrying a `upiId`) are never weak.
 */
export function isWeakSignature(rule: TagRule): boolean {
  if (rule.upiId) return false;
  const signature = rule.signature ?? "";
  const tokenCount = signature.split(" ").filter((token) => token.length > 0).length;
  return (
    tokenCount < TAGGING.MIN_SIGNATURE_TOKENS || signature.length < TAGGING.MIN_SIGNATURE_CHARS
  );
}

/** True when the rule has not matched within the dormancy window. */
export function isDormant(rule: TagRule, now: number): boolean {
  return now - rule.lastMatchedAt > TAGGING.DORMANT_AFTER_MS;
}

/**
 * Classifies a rule as `established` (eligible to auto-apply) when its winner
 * has both enough evidence and a clear majority and the rule is not dormant;
 * otherwise `provisional`.
 */
export function classify(rule: TagRule, now: number): "established" | "provisional" {
  const { evidence, majority } = strengthOf(rule);
  const established =
    evidence >= TAGGING.MIN_EVIDENCE &&
    majority >= TAGGING.MIN_MAJORITY &&
    !isDormant(rule, now);
  return established ? "established" : "provisional";
}

/** Sums `votes` and `autoApplied` per tag into a single combined-strength map. */
function combinedStrengths(rule: TagRule): Record<string, number> {
  const combined: Record<string, number> = {};
  for (const [tagId, count] of Object.entries(rule.votes)) {
    combined[tagId] = (combined[tagId] ?? 0) + count;
  }
  for (const [tagId, count] of Object.entries(rule.autoApplied)) {
    combined[tagId] = (combined[tagId] ?? 0) + count;
  }
  return combined;
}
