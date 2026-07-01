/**
 * In-memory test doubles for the calibration engine.
 *
 * A plain-map fake of the `CalibrationData` port plus small typed factories for
 * building `CalibrationTag` / `CalibrationBudget` rows and `CategorySpend`
 * inputs. Pure helpers — no fyre-db, no repos. Imported by the `*.test.ts`
 * files in this folder; not collected as a test itself (no `.test.ts` suffix).
 */

import type { BaseEntity, Hlc } from "@fyre-db/core"
import type { Budget, BudgetPeriod } from "@/entities/budget"
import type { Tag, TagType, TagFlow } from "@/entities/tag"
import type {
  CalibrationBudget,
  CalibrationData,
  CalibrationTag,
  CategorySpend,
} from "@/services/calibration/types"

const HLC: Hlc = { timestamp: 0, counter: 0, nodeId: "test" }
const EPOCH = new Date(0)

function baseEntity(id: string): BaseEntity {
  return { id, createdAt: EPOCH, updatedAt: EPOCH, version: 1, device: "test", hlc: HLC }
}

type TagOverrides = Partial<Tag> & { readonly id?: string; readonly type?: TagType; readonly flow?: TagFlow }

/** Builds a `CalibrationTag` with sensible defaults; override `type`/`flow`. */
export function makeTag(over: TagOverrides = {}): CalibrationTag {
  const id = over.id ?? "system-tag-food"
  return {
    ...baseEntity(id),
    name: over.name ?? "Food",
    icon: over.icon ?? "utensils",
    description: over.description,
    parent: over.parent,
    type: over.type,
    flow: over.flow,
  }
}

type BudgetOverrides = Partial<Budget> & { readonly id?: string; readonly period?: BudgetPeriod }

/** Builds a `CalibrationBudget` with sensible defaults; override what matters. */
export function makeBudget(over: BudgetOverrides = {}): CalibrationBudget {
  const tagId = over.tagId ?? "system-tag-food"
  const year = over.year ?? 2025
  return {
    ...baseEntity(over.id ?? `${tagId}:${year}`),
    tagId,
    year,
    amount: over.amount ?? 0,
    period: over.period ?? "monthly",
  }
}

type SpendOverrides = Partial<CategorySpend>

/** Builds a `CategorySpend` input; override the numbers under test. */
export function makeSpend(over: SpendOverrides = {}): CategorySpend {
  return {
    tagId: over.tagId ?? "system-tag-food",
    thisMonth: over.thisMonth ?? 0,
    trailing: over.trailing ?? [],
    yearToDate: over.yearToDate ?? 0,
  }
}

/**
 * A `CalibrationData` port backed by plain maps, scoped to one fake tenant and
 * fiscal year. Pass the tags and budgets the test needs; lookups miss (return
 * `undefined`) for anything not supplied, exactly like a cold partition.
 */
export function createFakeCalibrationData(
  tags: readonly CalibrationTag[] = [],
  budgets: readonly CalibrationBudget[] = [],
): CalibrationData {
  const tagById = new Map(tags.map((t) => [t.id, t]))
  const budgetByTag = new Map(budgets.map((b) => [b.tagId, b]))
  return {
    tag: (tagId) => tagById.get(tagId),
    budget: (tagId) => budgetByTag.get(tagId),
  }
}
