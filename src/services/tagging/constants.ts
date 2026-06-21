/**
 * Tagging engine tuning constants.
 *
 * The single source of tuning for the tagging engine: all engine behaviour
 * (thresholds, evidence floors, dormancy) reads from this object, so tuning is
 * one edit. These are starting values to validate against real data.
 *
 * See `docs/tagging-engine-spec.md` §9 and `docs/auto-tagging-design.md` §7.4.
 */
export const TAGGING = {
  MIN_EVIDENCE: 2,
  MIN_MAJORITY: 0.65,
  AUTO_APPLY_THRESHOLD: 0.8,
  SUGGEST_THRESHOLD: 0.6,
  MIN_SIGNATURE_TOKENS: 2,
  MIN_SIGNATURE_CHARS: 6,
  RECURRENCE_MIN: 2,
  DORMANT_AFTER_MS: 18 * 30 * 24 * 60 * 60 * 1000, // ~18 months
} as const;
