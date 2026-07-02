/**
 * Module-level pure helpers for the attention function.
 *
 * Deterministic, side-effect-free functions lifted out of `engine.ts` (mirrors
 * `calibration/engine-internals.ts`). The `AttentionEngine` imports the exported
 * helpers; anything else stays private to this module.
 *
 * The signal is computed from the calibration engine's OWN exported pure helpers
 * (`median`, `deviationFraction`, `flowDirection`, `hasEnoughTrailing`) so the two
 * layers share one definition of "the baseline" and can never drift. This is the
 * §15.6 integration: the ₹ axis is computed HERE, before/beside the engine's
 * %-only gate, so the big-₹/quiet-% override case is representable at all.
 *
 * See `docs/baseline-calibration-design.md` §15.2 (the gate), §15.3 (prominence),
 * §15.4 (what's routed off the strip).
 */

import {
  deviationFraction,
  flowDirection,
  hasEnoughTrailing,
  median,
} from "@/services/calibration/engine-internals"

import { ATTENTION } from "./constants"

import type { CalibrationData, CategorySpend } from "@/services/calibration"
import type { CategorySignal, GateProfile, StripType } from "./types"

/** Which of the three prominence zones a signal's MAGNITUDE lands in (§15.3). */
export type GateClass = "headline" | "club" | "silent"

/**
 * The gate profile for a strip-eligible predictability `type` (§15.2). Total over
 * `StripType` — `Occasional`/unknown never reach here (`signalOf` filters them,
 * §15.4), so there is no dead "no profile" arm to cover.
 */
export function profileFor(type: StripType): GateProfile {
  switch (type) {
    case "Fixed":
      return ATTENTION.PROFILES.Fixed
    case "Metered":
      return ATTENTION.PROFILES.Metered
    case "Everyday":
      return ATTENTION.PROFILES.Everyday
  }
}

/**
 * Computes one category's raw signal, or `undefined` when the category does not
 * belong on the deviation strip at all. The `undefined` cases mirror the engine
 * exactly so the strip and the per-category verdicts never disagree about who's
 * in play:
 *
 *   - unknown tag / `flow: excluded`  → pre-gated out (§13.2)
 *   - directly budgeted               → Rule 1 progress bar, not a strip alert (§3)
 *   - `flow: target` (a floor)        → the floor-watch feeder, not this gate (§15.4)
 *   - `Occasional` / unknown type     → display-only, off the strip (§15.4)
 *   - cold start (no trustworthy median / zero baseline) → nothing to deviate from (§9)
 *
 * Everything that survives is an unbudgeted ceiling category (Fixed / Metered /
 * Everyday) with a trustworthy baseline — exactly the pool the gate reasons about.
 */
export function signalOf(
  spend: CategorySpend,
  data: CalibrationData,
): CategorySignal | undefined {
  const tag = data.tag(spend.tagId)
  if (!tag || tag.flow === "excluded") return undefined

  // Budgeted categories are the progress-bar surface (Rule 1), never the
  // trailing-baseline strip — first match wins, exactly as the engine routes.
  if (data.budget(spend.tagId)) return undefined

  const direction = flowDirection(tag.flow)
  // Floors (targets) speak through the floor-watch feeder — a learned per-period
  // rhythm + year-end ramp (§15.4) — not this deviation gate. Deferred: that
  // feeder needs rhythm data the engine does not yet expose.
  if (direction === "floor") return undefined

  // Occasional (and unknown) categories are display-only — routed to composition,
  // never the strip (§15.4). This is the engine's Rule 4 (sporadic) branch,
  // written as a direct type guard so `type` narrows to `StripType` for the
  // profile lookup — the three ceiling classes that carry a trailing baseline.
  const type = tag.type
  if (type === undefined || type === "Occasional") return undefined

  // Cold-start guards, mirrored from the engine: no baseline, too few months, or
  // a zero baseline all mean there's nothing honest to deviate from (§9).
  const expected = median(spend.trailing)
  if (expected === undefined) return undefined
  if (!hasEnoughTrailing(spend.trailing)) return undefined

  const dFraction = deviationFraction(spend.thisMonth, expected)
  if (dFraction === undefined) return undefined

  const dAmount = spend.thisMonth - expected

  return {
    tagId: spend.tagId,
    type,
    direction,
    thisMonth: spend.thisMonth,
    expected,
    deviationFraction: dFraction,
    deviationAmount: dAmount,
    // Adverse = the direction that costs the user. Only ceilings reach here
    // (floors returned undefined above — they route to the floor-watch feeder),
    // so an adverse move is unambiguously an over-run.
    adverse: dAmount > 0,
  }
}

/**
 * The prominence zone for a signal's MAGNITUDE against its profile (§15.2/§15.3).
 * Direction-agnostic — the caller routes adverse vs favorable — so it serves both
 * the strip (adverse) and the good-month appreciation test (favorable, §15.5):
 *
 *   |d₹| ≥ headline                 → `headline`   (big money overrules a quiet %)
 *   |d₹| ≥ floor  AND  |d%| ≥ gate  → `club`       (a real % move of material size)
 *   otherwise                       → `silent`     (lint, or normal wobble)
 */
export function gateClass(signal: CategorySignal, profile: GateProfile): GateClass {
  const magAmount = Math.abs(signal.deviationAmount)
  const magFraction = Math.abs(signal.deviationFraction)

  if (magAmount >= profile.headline) return "headline"
  if (magAmount >= profile.floor && magFraction >= profile.gate) return "club"
  return "silent"
}
