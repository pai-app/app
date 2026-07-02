/**
 * The attention function — turns the calibration signal for a batch of
 * categories into the strip Home renders (§15). One layer above the calibration
 * engine: it consumes the same `CategorySpend[]`, computes each category's raw
 * signal via the engine's own pure helpers, applies the per-type
 * FLOOR/GATE/HEADLINE gate, ranks and splits into headlines + a clubbed tail,
 * and — only when nothing tripped — composes the good-month appreciation note.
 *
 * Pure, like the engine: it reads live tag/budget state through the injected
 * `CalibrationData` port and returns a value; it never writes and never renders.
 * A calm month (no headlines, no club) is a first-class result (§9, §15.1), not
 * a failure to find one.
 *
 * The module-level pure helpers live in `./engine-internals`; this file holds
 * only the class.
 *
 * See `docs/baseline-calibration-design.md` §15.
 */

import { ATTENTION } from "./constants"
import { gateClass, profileFor, signalOf } from "./engine-internals"

import type { CalibrationData, CategorySpend } from "@/services/calibration"
import type {
  AttentionAppreciation,
  AttentionClub,
  AttentionHeadline,
  AttentionStrip,
  CategorySignal,
} from "./types"

export class AttentionEngine {
  // Injected data port — same instance the CalibrationEngine reads, so the two
  // agree on live tag/budget state. Explicit field (not a parameter property):
  // the repo's `erasableSyntaxOnly` forbids the shorthand — matches both engines.
  private readonly data: CalibrationData

  constructor(data: CalibrationData) {
    this.data = data
  }

  /**
   * Composes the strip for a month's rolled-up category spends (§15). Runs each
   * category through the gate, ranks the admitted pool by ₹ severity, promotes
   * the top `MAX_HEADLINES` big movers to headlines and folds the rest into the
   * club. When nothing is admitted, returns the empty strip carrying the
   * good-month appreciations instead (§15.5).
   */
  compose(spends: readonly CategorySpend[]): AttentionStrip {
    const headlinePool: { signal: CategorySignal; severity: number }[] = []
    const clubPool: { signal: CategorySignal; severity: number }[] = []

    for (const spend of spends) {
      const signal = signalOf(spend, this.data)
      if (signal === undefined) continue

      // The strip shows adverse deviation only — favorable moves are good-month
      // material, not slots (§15.4). Held aside for the empty-state note below.
      if (!signal.adverse) continue

      const severity = Math.abs(signal.deviationAmount)
      const zone = gateClass(signal, profileFor(signal.type))
      if (zone === "headline") headlinePool.push({ signal, severity })
      else if (zone === "club") clubPool.push({ signal, severity })
      // "silent" — lint or normal wobble — never reaches the strip.
    }

    // Rank both pools by ₹ severity, biggest first (§15.3: ₹ decides prominence).
    headlinePool.sort((a, b) => b.severity - a.severity)
    clubPool.sort((a, b) => b.severity - a.severity)

    // Cap headlines; anything past the cap folds into the club so a wild month
    // can't become a wall of alerts (§15.3). Overflow keeps its severity order.
    const promoted = headlinePool.slice(0, ATTENTION.MAX_HEADLINES)
    const overflow = headlinePool.slice(ATTENTION.MAX_HEADLINES)
    const clubbed = [...clubPool, ...overflow].sort((a, b) => b.severity - a.severity)

    const headlines: AttentionHeadline[] = promoted.map(({ signal, severity }) => ({
      tagId: signal.tagId,
      type: signal.type,
      direction: signal.direction,
      thisMonth: signal.thisMonth,
      expected: signal.expected,
      deviationFraction: signal.deviationFraction,
      deviationAmount: signal.deviationAmount,
      severity,
    }))

    const club: AttentionClub | undefined =
      clubbed.length === 0
        ? undefined
        : {
            count: clubbed.length,
            combinedAmount: clubbed.reduce((sum, m) => sum + m.severity, 0),
            tagIds: clubbed.map((m) => m.signal.tagId),
          }

    // Appreciations are the CONTENT of the empty state (§15.5), never a second
    // channel — computed only when the strip found nothing adverse to headline.
    const appreciations =
      headlines.length === 0 && club === undefined ? this.appreciationsOf(spends) : []

    return { headlines, club, appreciations }
  }

  /**
   * The favorable standouts for a calm month's good-month note (§15.5): material
   * beneficial moves (spent notably less on a ceiling), ranked by ₹ and capped at
   * `APPRECIATION_MAX` so it stays a note, not a victory lap. Uses the SAME gate
   * as the strip, mirrored to the favorable side — a real move, not "you saved
   * ₹200" — so appreciation and alerting share one materiality bar.
   */
  private appreciationsOf(spends: readonly CategorySpend[]): readonly AttentionAppreciation[] {
    const wins: { appreciation: AttentionAppreciation; magnitude: number }[] = []

    for (const spend of spends) {
      const signal = signalOf(spend, this.data)
      if (signal === undefined) continue
      if (signal.adverse) continue

      // Same gate, favorable side: only surface a win material enough to have
      // earned a slot had it gone the other way (club-or-better).
      if (gateClass(signal, profileFor(signal.type)) === "silent") continue

      const magnitude = Math.abs(signal.deviationAmount)
      wins.push({
        appreciation: {
          tagId: signal.tagId,
          direction: signal.direction,
          deviationAmount: signal.deviationAmount,
          magnitude,
        },
        magnitude,
      })
    }

    return wins
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, ATTENTION.APPRECIATION_MAX)
      .map((w) => w.appreciation)
  }
}
