/**
 * Pure bigram (2-gram) Dice coefficient for signature-vs-signature similarity.
 *
 * Deterministic and side-effect free: no I/O, no clock, no randomness, no
 * module-level mutable state, no external dependency. Used only by
 * `matchTransaction` to score a transaction signature against a rule signature
 * (UPI-exact matches bypass it).
 *
 * See `docs/tagging-engine-spec.md` §4 and `docs/auto-tagging-design.md` §7.2.
 */

/**
 * Returns the bigram Dice coefficient of `a` and `b` in the range `0..1`.
 *
 * `Dice = 2 * |intersection| / (|bigramsA| + |bigramsB|)`, where each string's
 * adjacent character bigrams form a multiset (repeated bigrams count
 * individually) and the intersection is the multiset intersection.
 *
 * Edge case (deterministic): strings with no bigrams — both empty or shorter
 * than 2 characters — yield `1` when `a === b` and `0` otherwise. This keeps
 * identical inputs maximally similar and disjoint inputs minimally similar
 * without dividing by zero.
 */
export function dice(a: string, b: string): number {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.length === 0 || bigramsB.length === 0) return a === b ? 1 : 0;

  const counts = new Map<string, number>();
  for (const gram of bigramsA) counts.set(gram, (counts.get(gram) ?? 0) + 1);

  let intersection = 0;
  for (const gram of bigramsB) {
    const remaining = counts.get(gram) ?? 0;
    if (remaining > 0) {
      counts.set(gram, remaining - 1);
      intersection += 1;
    }
  }

  return (2 * intersection) / (bigramsA.length + bigramsB.length);
}

/** Builds the ordered multiset of adjacent character bigrams of `value`. */
function bigrams(value: string): readonly string[] {
  const result: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) {
    result.push(value.slice(i, i + 2));
  }
  return result;
}
