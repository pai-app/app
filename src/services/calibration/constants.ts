/**
 * Calibration engine tuning constants.
 *
 * The single source of tuning for the calibration engine: every threshold reads
 * from this object, so tuning is one edit. These are starting values to validate
 * against real data (mirrors `tagging/constants.ts`).
 *
 * See `docs/baseline-calibration-design.md` §3 (rules), §8 (latency), §9
 * (asymmetry of errors), and Appendix (1-month vs 3-month ruler).
 */
export const CALIBRATION = {
  /**
   * How far an unbudgeted **frequent** category (Rule 3) must run over its
   * trailing normal, as a fraction, before it's "hot" enough to earn an
   * attention slot. 0.35 = 35% over. The doc's canonical case — 15k/14k/16k
   * (median 15k) → 23k — is +53%, comfortably hot.
   */
  HOT_DEVIATION: 0.35,

  /**
   * A **committed** bill's amount (Rule 0) counts as "changed" when it deviates
   * from its trailing median by at least this fraction. Tighter than
   * HOT_DEVIATION because committed amounts are supposed to be stable, so a
   * smaller move is already worth a word ("your rent went up").
   */
  COMMITTED_CHANGE: 0.15,

  /**
   * Minimum trailing months required before a trailing comparison (Rule 3 /
   * Rule 0 amount) is trusted. Below this we stay silent rather than guess —
   * the asymmetry of errors (§9) says a cold-start false alarm is far costlier
   * than a miss. Starts at the N=1 floor the Appendix accepts; raise toward a
   * 3-month median when lumpy months start annoying.
   */
  MIN_TRAILING: 2,

  /** Default number of attention slots Home's strip composes from the pool (§11). */
  ATTENTION_SLOTS: 3,
} as const
