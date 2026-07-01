/**
 * Calibration engine — public surface.
 *
 * The engine that decides whether a category's spend this month is high, low, or
 * normal *for this user* (`docs/baseline-calibration-design.md`). A pure ranker:
 * it computes verdicts and ranks alerts, but never persists and never renders.
 */

export { CalibrationEngine } from "./engine"
export { CALIBRATION } from "./constants"

export type {
  CalibrationData,
  CalibrationBudget,
  CalibrationTag,
  CalibrationRule,
  CalibrationVerdict,
  CategorySpend,
  Comparison,
  FlowDirection,
} from "./types"
