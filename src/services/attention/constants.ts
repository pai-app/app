/**
 * Attention-strip tuning constants.
 *
 * The single source of tuning for the attention function (§15) — the layer that
 * turns the calibration engine's per-category signal into the 0–M things Home's
 * strip actually says. Every threshold reads from this object, so tuning is one
 * edit (mirrors `calibration/constants.ts`). These are starting values to
 * calibrate against real statement months.
 *
 * Amounts are in **minor units** (paise): ₹1 = 100. FLOOR and HEADLINE are the
 * two ₹ knobs the attention function ADDS on top of the engine's %-only gate;
 * the % GATE reuses the engine's own thresholds (COMMITTED_CHANGE / HOT_DEVIATION
 * — see the per-type note below), so the two layers stay in lockstep.
 *
 * See `docs/baseline-calibration-design.md` §15.2 (the gate), §15.3 (prominence).
 */
export const ATTENTION = {
  /**
   * Per-type gate profiles (§15.2). The tag's predictability `type` picks one —
   * a ₹649→₹799 Netflix jump is alarming (Fixed shouldn't move) while Food
   * swinging +30% is Tuesday, so the same move gates differently by type.
   *
   * - `floor`    — materiality line (₹). Below it, silent no matter how loud the
   *                %; this is what makes "% mostly" safe against small-base blowups.
   * - `gate`     — % deviation bar. Matches the engine: Fixed/Metered = 0.15
   *                (COMMITTED_CHANGE), Everyday = 0.35 (HOT_DEVIATION).
   * - `headline` — big-money line (₹). At or above it, ₹ overrules a quiet % and
   *                the item earns its own headline; below it (but past the gate)
   *                it folds into the club (§15.3).
   *
   * `Occasional` and unknown types have NO profile — they are display-only and
   * never reach the strip (§15.4), so `profileFor` returns undefined for them.
   * FLOOR and GATE interact, so these are tuned as SETS against real months, not
   * as independent dials — placeholder values pending real statement data.
   */
  PROFILES: {
    Fixed: { floor: 10_000, gate: 0.15, headline: 300_000 }, // ₹100 floor · ₹3,000 headline
    Metered: { floor: 20_000, gate: 0.15, headline: 400_000 }, // ₹200 floor · ₹4,000 headline
    Everyday: { floor: 100_000, gate: 0.35, headline: 500_000 }, // ₹1,000 floor · ₹5,000 headline
  },

  /**
   * Hard cap on headlines the strip shows (§15.3). Beyond this, the lowest-ranked
   * headlines fold into the club so a wild month can't become a wall of alerts —
   * the anti-pattern the philosophy refuses. Mirrors `CALIBRATION.ATTENTION_SLOTS`.
   */
  MAX_HEADLINES: 3,

  /**
   * Most favorable standouts the empty-state good-month line enumerates (§15.5).
   * Kept tight (one or two) so appreciation stays a note, not a victory lap —
   * enumerating every dip would rebuild the symmetric strip §15.4 deletes.
   */
  APPRECIATION_MAX: 2,
} as const
