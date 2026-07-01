/**
 * Calibration engine port + output types.
 *
 * The `CalibrationData` port is the engine's ONLY dependency on storage: a small
 * synchronous interface the app implements over fyre-db, scoped to one tenant
 * and one fiscal year. The output types are the engine's verdicts — it computes
 * and returns these, but never writes and never renders (Home composes the
 * briefing from the ranked pool — §11).
 *
 * Mirrors `tagging/types.ts`: the port returns app entity shapes (widened with
 * `BaseEntity`), imported type-only; the output types are engine-owned.
 *
 * See `docs/baseline-calibration-design.md` §3, §5, §11.
 */

import type { BaseEntity } from "@fyre-db/core"

import type { Budget, BudgetPeriod } from "@/entities/budget"
import type { Tag, TagType, TagFlow } from "@/entities/tag"
import type { Money } from "@/entities/money"

/** App budget row, as the engine sees it through the port. */
export type CalibrationBudget = Budget & BaseEntity

/** App tag row, as the engine sees it through the port. */
export type CalibrationTag = Tag & BaseEntity

/**
 * The spend the engine reasons about for one category, already rolled up by the
 * app (the engine does not itself sum transactions — it's handed the totals so
 * it stays pure arithmetic over a small input).
 *
 * - `tagId` — the parent tag this category rolls up (calibration is per parent, §2).
 * - `thisMonth` — signed minor units for the current month (the point being judged).
 * - `trailing` — prior whole months, most-recent-LAST, already excluding the
 *   current month. Length may be 0 (cold start). Used for the trailing median.
 * - `yearToDate` — cumulative signed minor units across the fiscal year so far
 *   (for the budget progress bar — Rule 1).
 *
 * All amounts are magnitudes as spend (the app resolves sign per `flow`, so the
 * engine compares positive numbers — see `flowDirection`). `excluded` tags are
 * never handed here (the app drops them via the pre-gate).
 */
export type CategorySpend = {
  readonly tagId: string
  readonly thisMonth: Money
  readonly trailing: readonly Money[]
  readonly yearToDate: Money
}

/**
 * The data port — the engine's ONLY dependency on storage. Synchronous, reads
 * the in-memory store live on every call (no snapshot). Scoped to one tenant
 * and one fiscal year (the year whose budgets are hydrated — §13.3).
 */
export interface CalibrationData {
  /** The tag row for a category, or `undefined` if unknown. Carries `type`/`flow`. */
  tag(tagId: string): CalibrationTag | undefined
  /**
   * The budget for a tag in the active fiscal year, or `undefined` if none.
   * Direct partition lookup by `tagId:year` (§13.3) — no scan.
   */
  budget(tagId: string): CalibrationBudget | undefined
}

/**
 * Which way is good for a category. Derived from the tag's `flow`, never stored
 * on the budget (§13.2): an expense is a `ceiling` (over = bad), income /
 * investment / savings is a `floor` (under = bad, over = a win).
 */
export type FlowDirection = "ceiling" | "floor"

/**
 * How this month's number compares to what the engine expected. `direction`
 * reads off the tag's flow so the SAME magnitude comparison means "overspent"
 * for Dining and "under-invested" for Investments.
 */
export type Comparison = "above" | "below" | "normal"

/**
 * Which resolution rule produced a verdict (§3). Carried on the verdict so the
 * UI and tests can see *why* the engine spoke — and so the not-yet-buildable
 * rules are named rather than silently absent.
 */
export type CalibrationRule =
  | "committed"          // Rule 0
  | "budgeted-direct"    // Rule 1
  | "budgeted-inherited" // Rule 2 — stubbed in v1 (Rug 2 cut, §0)
  | "frequent"           // Rule 3
  | "sporadic"           // Rule 4

/**
 * The engine's read on one category this month. A discriminated union so the
 * consumer handles each shape explicitly.
 *
 * - `alert` — worth the user's eye: a frequent category running hot (Rule 3) or
 *   a committed bill whose amount changed / didn't arrive (Rule 0). Carries a
 *   `severity` (raw deviation) so Home can RANK the pool and take the top few;
 *   the engine ranks, Home edits (§11). NOT the same as "render this."
 * - `progress` — a budgeted category (Rule 1): raw progress toward the line,
 *   always showable. `paceVerdict` is deliberately absent for yearly budgets
 *   (Rug 1 — show the bar, withhold the pace, §7). A bar, not an alarm.
 * - `silent` — nothing worth saying: normal spend, or an unbudgeted sporadic
 *   category where a miss is free (Rule 4). "Nothing unusual" is a first-class
 *   answer (§9), and `silent` still carries its `rule` so tests/telemetry see
 *   the routing.
 */
export type CalibrationVerdict =
  | {
      readonly kind: "alert"
      readonly tagId: string
      readonly rule: CalibrationRule
      readonly comparison: Comparison
      readonly direction: FlowDirection
      /** Raw deviation from expected, as a signed fraction (+0.53 = 53% over). */
      readonly deviation: number
      /** Non-negative ranking currency for the attention strip (§0, §11). */
      readonly severity: number
      readonly thisMonth: Money
      readonly expected: Money
    }
  | {
      readonly kind: "progress"
      readonly tagId: string
      readonly rule: CalibrationRule
      readonly direction: FlowDirection
      readonly spent: Money
      readonly budget: Money
      readonly period: BudgetPeriod
      /** 0..1+ fraction of the budget consumed. Raw progress — always valid. */
      readonly fraction: number
    }
  | {
      readonly kind: "silent"
      readonly tagId: string
      readonly rule: CalibrationRule
    }

/** Re-exported for callers building the port / reasoning about routing. */
export type { TagType, TagFlow }
