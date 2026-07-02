/**
 * Attention function types — the strip's input signal and rendered output.
 *
 * The attention function (§15) sits one layer above the calibration engine: it
 * consumes the same `CategorySpend[]` the engine ranks, computes each category's
 * raw signal (d%, d₹, type, direction), applies the per-type FLOOR/GATE/HEADLINE
 * gate, and emits the strip — a small set of headlines plus a clubbed tail, or an
 * empty-state good-month note. Like the engine it is pure: it computes and
 * returns, never writes and never renders (Home renders the `AttentionStrip`).
 *
 * These types are engine-adjacent but distinct from `calibration/types.ts`: that
 * module's `CalibrationVerdict` is a per-category classification; this module's
 * output is the already-SELECTED, already-CLUBBED briefing (§15.6). It reuses the
 * engine's `FlowDirection` and the tag's `TagType` rather than redefining them.
 *
 * See `docs/baseline-calibration-design.md` §15.
 */

import type { Money } from "@/entities/money"
import type { FlowDirection } from "@/services/calibration"

/**
 * A per-type gate profile (§15.2) — the three knobs that decide whether a
 * category earns a slot and how loud. Amounts are minor units.
 *
 * - `floor` — materiality line (₹). Below it, silent regardless of %.
 * - `gate` — % deviation bar (a fraction, matching the engine's thresholds).
 * - `headline` — big-money line (₹). At/above it, ₹ overrules a quiet % and the
 *   item headlines; between floor and headline it clubs (§15.3).
 */
export type GateProfile = {
  readonly floor: Money
  readonly gate: number
  readonly headline: Money
}

/**
 * The subset of `TagType` that can reach the deviation strip (§15.4): the
 * unbudgeted ceiling classes with a trailing baseline. `Occasional` is excluded
 * by construction — it is display-only, routed to composition, never the strip —
 * so a signal can never carry it, and `profileFor` is total over exactly these.
 */
export type StripType = "Fixed" | "Metered" | "Everyday"


/**
 * One category's raw signal for the gate, computed by the attention function
 * from a `CategorySpend` + its tag. Both deviation currencies are carried
 * because the gate reads BOTH — % decides admission, ₹ decides prominence
 * (§15.3) — and neither can be reconstructed from the other without the base.
 *
 * - `deviationFraction` — signed d% over the trailing expected (`+0.53` = 53%
 *   over). The engine's currency; drives the GATE and the sign.
 * - `deviationAmount` — signed d₹ (`thisMonth − expected`) in minor units. The
 *   ₹ currency; drives FLOOR / HEADLINE. Its magnitude is `severity`.
 * - `adverse` — whether the move is in the direction that costs the user (over a
 *   ceiling / under a floor). The strip shows adverse deviation only (§15.4);
 *   favorable moves feed the good-month note (§15.5) instead.
 */
export type CategorySignal = {
  readonly tagId: string
  readonly type: StripType
  readonly direction: FlowDirection
  readonly thisMonth: Money
  readonly expected: Money
  readonly deviationFraction: number
  readonly deviationAmount: Money
  readonly adverse: boolean
}

/**
 * A single category that earned its own line on the strip — an adverse move that
 * cleared its type's HEADLINE (big ₹), or cleared the GATE with material ₹ and
 * ranked into the top `MAX_HEADLINES`. `severity` (= |d₹|) is the ranking
 * currency; Home renders the phrasing ("₹5k over your usual rent").
 */
export type AttentionHeadline = {
  readonly tagId: string
  readonly type: StripType
  readonly direction: FlowDirection
  readonly thisMonth: Money
  readonly expected: Money
  readonly deviationFraction: number
  /** Signed ₹ gap; positive = over, negative = under. */
  readonly deviationAmount: Money
  /** Non-negative ranking currency for the strip (= |deviationAmount|). */
  readonly severity: Money
}

/**
 * The folded tail of admitted-but-minor movers (§15.3): categories that passed
 * the gate but fell under HEADLINE, plus any headlines pushed out by the cap. A
 * SUMMARY, not a truncation — it names the count and combined ₹ so "minor" is
 * never a lie, and it is tappable into the full list (`tagIds` carries it).
 */
export type AttentionClub = {
  readonly count: number
  /** Sum of the members' |deviationAmount|, for the "~₹1.4k combined" label. */
  readonly combinedAmount: Money
  /** Members, most-severe-first — the payload for the tap-through full list. */
  readonly tagIds: readonly string[]
}

/**
 * One favorable standout for the empty-state good-month note (§15.5) — a real
 * beneficial move (under a ceiling / over a floor) worth a mention. Only
 * populated when the strip is otherwise empty; never shown alongside headlines.
 */
export type AttentionAppreciation = {
  readonly tagId: string
  readonly direction: FlowDirection
  /** Signed ₹ gap (negative = spent less on a ceiling — the good case). */
  readonly deviationAmount: Money
  readonly magnitude: Money
}

/**
 * The strip Home renders (§15) — the whole output of the attention function.
 *
 * - `headlines` — 0..MAX_HEADLINES adverse standouts, most-severe-first.
 * - `club` — the folded minor tail, or `undefined` when nothing was clubbed.
 * - `appreciations` — populated ONLY when `headlines` is empty (a calm month):
 *   the enumerated good-month standouts, or empty for a plain "calm month" line
 *   (§15.5). When `headlines` is non-empty this is always empty.
 *
 * `headlines` empty AND `club` undefined = a calm month, a first-class answer
 * (§9, §15.1) — Home shows the good-month note, not an empty state.
 */
export type AttentionStrip = {
  readonly headlines: readonly AttentionHeadline[]
  readonly club: AttentionClub | undefined
  readonly appreciations: readonly AttentionAppreciation[]
}
