import { defineEntity, partitioned } from "@fyre-db/core"

import type { Money } from "./money"

/**
 * Whether a budget's amount applies per calendar month or across the whole
 * fiscal year. A scalar period, not a 12-month allocation (see
 * docs/baseline-calibration-design.md §13.1).
 */
export type BudgetPeriod = "monthly" | "yearly"

/**
 * Budget — a per-year watch-line the user draws on any tag (§13).
 *
 * The user pointing at one thing they're watching and setting a single number.
 * NOT a baseline system: most tags have none, and that's expected. Its presence
 * is what pulls a tag from signal-only into a *completeness contract* — the
 * calibration engine's Rule 1 ("you asked me to watch this, I owe a verdict").
 *
 * Direction is deliberately NOT stored here (§13.2). `amount` is a non-negative
 * magnitude; whether going *over* is a failure (a ceiling, e.g. Dining) or a win
 * (a floor, e.g. Investments) is read off the tag's `type`/`flow`, never off the
 * budget. This keeps the budget a pure `{ amount, period }` that serves caps and
 * targets identically. (`limit` would be the wrong word for a floor — hence the
 * neutral `amount`.)
 *
 * Scope (§13.3): a budget is scoped to one fiscal year, keyed `tagId + year`,
 * and never mutated — each year is a fresh row, so viewing the past stays honest
 * by construction and the resolver is a direct lookup, not a "latest row ≤ Y"
 * scan. Earned, not inherited. A budget does NOT carry forward on rollover; the
 * lapse is the Nudge pipe's job (§13.4, §14), not this entity's.
 *
 * Partitioned by fiscal `year` so cold years evict from memory, aligning with
 * `transaction` sharding. The composite id encodes the year, so a lookup for a
 * tag's budget in year Y is a direct hit inside that year's partition.
 */
export type Budget = {
  readonly tagId: string         // → Tag.id (parent or child)
  readonly year: number          // fiscal year start year — 2025 = FY 2025–26 (see lib/fiscal)
  readonly amount: Money         // non-negative magnitude, minor units; direction read off the tag
  readonly period: BudgetPeriod  // monthly xor yearly (one budget per tag per year — §13.4)
}

/**
 * A persisted budget as the UI consumes it — the domain fields plus the stable
 * `id`. Mirrors `TransactionRow` / `AccountRow`: the stored row is a superset,
 * so it satisfies this without leaking fyre-db internals into the UI.
 */
export type BudgetRow = Budget & { readonly id: string }

/**
 * Partition key for a fiscal year. Budgets shard one blob per fiscal year; use
 * this to scope a partitioned `query`/`observeQuery` (and drive lazy partition
 * hydration) to exactly the year being viewed. Mirrors `importSourceMonthKey`.
 *
 * @param year Fiscal year start year (e.g. 2025 for FY 2025–26).
 */
export function budgetYearKey(year: number): string {
  return String(year)
}

export const budgetEntity = defineEntity<Budget>("budget", {
  // The fiscal year is itself the partition dimension (no timestamp math). The
  // composite id encodes it, so cross-partition lookup stays unambiguous.
  keyStrategy: partitioned<Budget>((b) => budgetYearKey(b.year)),
  // `tagId:year` — one budget per tag per year regardless of period, so setting
  // a monthly then a yearly budget upserts the same row (the §13.4 xor, for free).
  deriveId: (b) => `${b.tagId}:${b.year}`,
})
