import { defineEntity } from "@fyre-db/core"

/**
 * Predictability class of a tag — routes which calibration rule applies
 * (see docs/baseline-calibration-design.md §4). User-readable words:
 *   - `Fixed`      — known when + how much (rent, EMI, insurance, subscriptions)
 *   - `Metered`    — known when, varies how much (electricity, utility bills)
 *   - `Everyday`   — recurs every month, amount varies (food, fuel, groceries)
 *   - `Occasional` — irregular timing, a few times a year (travel, gifts, medical)
 */
export type TagType = "Fixed" | "Metered" | "Everyday" | "Occasional"

/**
 * The tag's role in spend totals. Defaults to `expense` when unset.
 *   - `expense`  — normal outflow, counts as spend (the default)
 *   - `target`   — more-is-better, counts toward income/goals (income, investments)
 *   - `excluded` — never counted (self-transfers, cash movements, card-bill repayment)
 *
 * `excluded` short-circuits calibration: the engine drops the tag from totals
 * before any rule runs, so `type` is moot on excluded tags.
 */
export type TagFlow = "expense" | "target" | "excluded"

/**
 * Tag — categorises transactions. Stored globally per tenant. Hierarchical via
 * the optional `parent` reference to another Tag id; flat at the schema level,
 * tree at the app layer.
 *
 * `icon` is a string key into the shared icon registry (see lib/icons). It is
 * intentionally not typed against `IconKey` so tags survive icon manifest
 * changes; the UI falls back gracefully if the icon goes missing.
 *
 * `type` and `flow` are calibration metadata consumed by the baseline engine.
 * Both inherit parent → child unless the child overrides them; the system-tag
 * catalogue resolves the effective value onto every row at seed time.
 */
export type Tag = {
  readonly name: string
  readonly icon: string
  readonly description?: string
  readonly parent?: string
  readonly type?: TagType
  readonly flow?: TagFlow
}

export const tagEntity = defineEntity<Tag>("tag", {
  keyStrategy: "global",
})
