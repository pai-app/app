/**
 * Attention function — public surface.
 *
 * Turns the calibration engine's per-category signal into the strip Home renders
 * (§15): 0..M adverse headlines, a clubbed minor tail, or a calm-month note. A
 * pure selector — it computes and returns, never persists and never renders.
 *
 * See `docs/baseline-calibration-design.md` §15.
 */

export { AttentionEngine } from "./engine"
export { ATTENTION } from "./constants"

export type {
  AttentionStrip,
  AttentionHeadline,
  AttentionClub,
  AttentionAppreciation,
  CategorySignal,
  GateProfile,
  StripType,
} from "./types"
