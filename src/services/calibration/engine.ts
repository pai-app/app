/**
 * The calibration engine — a per-tenant, per-fiscal-year class owning the
 * "is this number high / low / normal for you" decision (§1).
 *
 * Depends only on the injected `CalibrationData` port: it reads live tag and
 * budget state via `this.data` (never a passed-in snapshot). Deterministic and
 * side-effect free — it computes and returns verdicts, but never writes (no
 * persistence) and never renders (Home composes the briefing from the ranked
 * pool — §11). This is plumbing, not the faucet.
 *
 * The engine is a **pure ranker**. It classifies each category into a verdict
 * and ranks the alerts by severity; deciding which alerts earn an attention
 * slot, and how to phrase them, is Home's job. "Nothing unusual this month" is
 * a first-class result (§9), so an all-`silent` pass is success, not failure.
 *
 * The module-level pure helpers live in `./engine-internals`; this file holds
 * only the class.
 *
 * See `docs/baseline-calibration-design.md` §3 (rules), §5 (matrix), §11 (Home).
 */

import { CALIBRATION } from "./constants"
import {
  alertVerdict,
  comparisonOf,
  deviationFraction,
  flowDirection,
  hasEnoughTrailing,
  median,
  progressVerdict,
  routeRule,
  silentVerdict,
} from "./engine-internals"

import type { CalibrationData, CalibrationVerdict, CategorySpend } from "./types"

export class CalibrationEngine {
  // Injected data port. Kept as an explicit field + constructor assignment (not
  // the `constructor(private readonly data)` shorthand) because the repo's
  // `erasableSyntaxOnly` forbids parameter properties — matches TaggingEngine.
  private readonly data: CalibrationData

  constructor(data: CalibrationData) {
    this.data = data
  }

  /**
   * Calibrates one category's spend into a verdict, running the §3 ladder
   * top-to-bottom and stopping at the first rule that matches. The ordering IS
   * the logic:
   *
   *   pre-gate  `flow: excluded`  → silent, never counted (self-transfer, cash…)
   *   Rule 1    budgeted          → progress bar (raw progress; no yearly pace, Rug 1)
   *   Rule 0    Fixed / Metered   → committed: speak only on amount change / absence
   *   Rule 3    Everyday          → frequent: alert if running hot vs trailing median
   *   Rule 4    Occasional / ?    → sporadic: display only, miss-is-free
   *
   * Reads tag + budget live via the port. `type`/`flow` inherit is already
   * resolved onto the tag at seed time, so the tag carries its effective class.
   */
  calibrate(spend: CategorySpend): CalibrationVerdict {
    const tag = this.data.tag(spend.tagId)

    // Pre-gate: excluded tags are dropped from totals before any rule runs (§13.2).
    // Defensive — the app should not even hand these in, but stay silent if it does.
    if (tag?.flow === "excluded") {
      return silentVerdict(spend.tagId, "sporadic")
    }

    const direction = flowDirection(tag?.flow)
    const budget = this.data.budget(spend.tagId)

    // Rule 1 — budgeted directly. Progress bar, not an alert (§3).
    if (budget) {
      return progressVerdict(budget, direction, spend.yearToDate)
    }

    const rule = routeRule(tag?.type, /* hasBudget */ false)

    // Rule 4 — sporadic (and the unknown-type default). Display only; being
    // wrong is free because nobody's watching (§9). No trailing comparison.
    if (rule === "sporadic") {
      return silentVerdict(spend.tagId, "sporadic")
    }

    // Rules 0 and 3 both compare this month to the trailing median, differing
    // only in the threshold: committed amounts should be stable (tighter), a
    // frequent category has to run genuinely hot (looser). Below the trailing
    // floor we stay silent rather than guess (§9 cold-start guard).
    if (!hasEnoughTrailing(spend.trailing)) {
      return silentVerdict(spend.tagId, rule)
    }

    const expected = median(spend.trailing)
    if (expected === undefined) {
      return silentVerdict(spend.tagId, rule)
    }

    const deviation = deviationFraction(spend.thisMonth, expected)
    if (deviation === undefined) {
      return silentVerdict(spend.tagId, rule)
    }

    const threshold =
      rule === "committed" ? CALIBRATION.COMMITTED_CHANGE : CALIBRATION.HOT_DEVIATION
    const comparison = comparisonOf(deviation, threshold)

    // For a ceiling (expense) only an *over*-run is worth a word — being under
    // budget on Food is good news, not an alert. For a floor (target) the
    // engine would flag an under-run, but targets are budgeted goals in
    // practice, so unbudgeted floors are rare; symmetric handling keeps it honest.
    if (comparison === "normal") {
      return silentVerdict(spend.tagId, rule)
    }
    if (direction === "ceiling" && comparison === "below") {
      return silentVerdict(spend.tagId, rule)
    }
    if (direction === "floor" && comparison === "above") {
      return silentVerdict(spend.tagId, rule)
    }

    return alertVerdict(spend.tagId, rule, direction, deviation, spend.thisMonth, expected)
  }

  /**
   * Calibrates a batch of categories in one pass, returning a map from `tagId`
   * to its verdict. A thin convenience over `calibrate` (mirrors
   * `TaggingEngine.matchMany`); the app supplies the rolled-up spends.
   */
  calibrateMany(spends: readonly CategorySpend[]): Map<string, CalibrationVerdict> {
    const verdicts = new Map<string, CalibrationVerdict>()
    for (const spend of spends) {
      verdicts.set(spend.tagId, this.calibrate(spend))
    }
    return verdicts
  }

  /**
   * The ranked attention pool for Home's strip (§11): every `alert` verdict from
   * a batch, sorted by `severity` descending, capped at `limit` (default
   * `ATTENTION_SLOTS`). The engine RANKS the pool; Home EDITS the briefing from
   * the top of it — an empty result means a calm month, which is a real answer,
   * not a failure to find one (§9, §11).
   *
   * Ranking by raw deviation is the deliberate v1 crude currency (§0); the
   * cross-category severity function is a parked upgrade (§11 open thread).
   */
  attentionPool(
    spends: readonly CategorySpend[],
    limit: number = CALIBRATION.ATTENTION_SLOTS,
  ): readonly CalibrationVerdict[] {
    const alerts: CalibrationVerdict[] = []
    for (const spend of spends) {
      const verdict = this.calibrate(spend)
      if (verdict.kind === "alert") alerts.push(verdict)
    }
    alerts.sort((a, b) => {
      const sa = a.kind === "alert" ? a.severity : 0
      const sb = b.kind === "alert" ? b.severity : 0
      return sb - sa
    })
    return alerts.slice(0, limit)
  }
}
