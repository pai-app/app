/**
 * Module-level pure helpers for the calibration engine.
 *
 * Deterministic, side-effect-free functions lifted out of `engine.ts` to keep
 * each file small and the routing logic unit-testable in isolation (mirrors
 * `tagging/engine-internals.ts`). The `CalibrationEngine` class imports the
 * exported helpers; anything else stays private to this module.
 *
 * See `docs/baseline-calibration-design.md` §3 (rules), §4 (types), §5 (matrix).
 */

import { CALIBRATION } from "./constants"

import type { Money } from "@/entities/money"
import type { TagType, TagFlow } from "@/entities/tag"
import type {
  CalibrationBudget,
  CalibrationRule,
  CalibrationVerdict,
  Comparison,
  FlowDirection,
} from "./types"

/**
 * The median of a list of numbers, or `undefined` for an empty list. Median
 * (not mean) because discretionary spend is lumpy — one travel month shouldn't
 * drag the trailing normal (Appendix: the 3-month *median* ruler). For an even
 * count, averages the two middle values.
 */
export function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Signed deviation of `actual` from `expected`, as a fraction of expected
 * (`+0.53` = 53% over, `-0.20` = 20% under). Returns `undefined` when
 * `expected` is 0 — there's no meaningful ratio against a zero baseline, and
 * the caller stays silent rather than divide by zero.
 */
export function deviationFraction(actual: Money, expected: Money): number | undefined {
  if (expected === 0) return undefined
  return (actual - expected) / Math.abs(expected)
}

/**
 * Which way is good for this tag (§13.2). `target` flow (income / investments /
 * cashback) is a **floor** — under is failure, over is a win. Everything else
 * is a **ceiling**. `excluded` never reaches here (pre-gated), so it defaults
 * to ceiling harmlessly.
 */
export function flowDirection(flow: TagFlow | undefined): FlowDirection {
  return flow === "target" ? "floor" : "ceiling"
}

/**
 * Reads a signed deviation as a `Comparison` relative to the flow direction, so
 * the same +Δ means "overspent" for a ceiling and "ahead" for a floor. `above`
 * / `below` are always in *magnitude* terms (more money than expected / less);
 * the direction tells the UI whether that's good or bad.
 */
export function comparisonOf(deviation: number, threshold: number): Comparison {
  if (deviation >= threshold) return "above"
  if (deviation <= -threshold) return "below"
  return "normal"
}

/**
 * The resolution rule for a category, given its predictability `type` and
 * whether the user drew a budget on it (§3 ladder, first match wins). Budget
 * presence promotes a category into the budgeted rules; `type` picks the
 * unbudgeted rule.
 *
 * NOTE: Rule 2 (budgeted-by-inheritance) is not routed here — it's a v1 cut
 * (Rug 2, §0). Parent aggregation is the app's concern; the engine only ever
 * sees a directly-budgeted tag as `budgeted-direct`.
 */
export function routeRule(type: TagType | undefined, hasBudget: boolean): CalibrationRule {
  if (hasBudget) return "budgeted-direct" // Rule 1
  switch (type) {
    case "Fixed":
    case "Metered":
      return "committed" // Rule 0 (Metered also gets a light amount check in the engine)
    case "Everyday":
      return "frequent" // Rule 3
    case "Occasional":
    case undefined:
      return "sporadic" // Rule 4 — the safe default: display, don't alert
  }
}

/**
 * Builds an `alert` verdict from a magnitude comparison. `severity` is the
 * absolute deviation — the crude non-negative ranking currency §0 asks for
 * (top-N by raw deviation), leaving the clever cross-category severity function
 * as a parked upgrade (§11 open thread).
 */
export function alertVerdict(
  tagId: string,
  rule: CalibrationRule,
  direction: FlowDirection,
  deviation: number,
  thisMonth: Money,
  expected: Money,
): CalibrationVerdict {
  return {
    kind: "alert",
    tagId,
    rule,
    comparison: deviation >= 0 ? "above" : "below",
    direction,
    deviation,
    severity: Math.abs(deviation),
    thisMonth,
    expected,
  }
}

/** Builds a `silent` verdict, preserving the routing rule for tests/telemetry. */
export function silentVerdict(tagId: string, rule: CalibrationRule): CalibrationVerdict {
  return { kind: "silent", tagId, rule }
}

/**
 * Builds a `progress` verdict for a budgeted category (Rule 1). `fraction` is
 * raw progress (spent / budget) — always valid, always showable. For a yearly
 * budget the *pace* verdict is intentionally NOT computed (Rug 1, §7): we show
 * the bar and let the user supply the on-track judgment.
 */
export function progressVerdict(
  budget: CalibrationBudget,
  direction: FlowDirection,
  spent: Money,
): CalibrationVerdict {
  const fraction = budget.amount === 0 ? 0 : spent / budget.amount
  return {
    kind: "progress",
    tagId: budget.tagId,
    rule: "budgeted-direct",
    direction,
    spent,
    budget: budget.amount,
    period: budget.period,
    fraction,
  }
}

/** The trailing series is long enough to trust a comparison (§9 cold-start guard). */
export function hasEnoughTrailing(trailing: readonly Money[]): boolean {
  return trailing.length >= CALIBRATION.MIN_TRAILING
}
