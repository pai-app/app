/**
 * In-memory test doubles for the tagging engine (T11).
 *
 * A plain-array fake of the `TaggingData` port plus small typed factories for
 * building `TaggingTransaction` / `TaggingRule` rows. Pure helpers — no
 * fyre-db, no repos, no mutable singletons. Imported by the `*.test.ts` files
 * in this folder; not collected as a test itself (no `.test.ts` suffix).
 */

import { buildSignature, extractUpiId, keyOf } from "@/services/tagging/extract"

import type { BaseEntity, Hlc } from "@fyre-db/core"
import type { TagRule } from "@/entities/tag-rule"
import type { Transaction } from "@/entities/transaction"
import type { TaggingData, TaggingRule, TaggingTransaction } from "@/services/tagging/types"

const HLC: Hlc = { timestamp: 0, counter: 0, nodeId: "test" }
const EPOCH = new Date(0)

function baseEntity(id: string): BaseEntity {
  return { id, createdAt: EPOCH, updatedAt: EPOCH, version: 1, device: "test", hlc: HLC }
}

/** The fixed rule `key` a narration resolves to (mirrors the real service). */
export function keyForNarration(narration: string): string {
  return keyOf(extractUpiId(narration), buildSignature(narration))
}

type TxOverrides = Partial<Transaction> & { readonly id?: string }

/** Builds a `TaggingTransaction` with sensible defaults; override what matters. */
export function makeTx(over: TxOverrides = {}): TaggingTransaction {
  const id = over.id ?? "tx-1"
  return {
    ...baseEntity(id),
    accountId: over.accountId ?? "acc-1",
    narration: over.narration ?? "",
    transactionAt: over.transactionAt ?? 0,
    amount: over.amount ?? 0,
    hash: over.hash ?? id,
    tagId: over.tagId,
    autoTagged: over.autoTagged,
    title: over.title,
    sourceId: over.sourceId,
  }
}

type RuleOverrides = Partial<TagRule> & { readonly id?: string }

/** Builds a `TaggingRule` with sensible defaults; override what matters. */
export function makeRule(over: RuleOverrides = {}): TaggingRule {
  const key = over.key ?? "sig:test"
  return {
    ...baseEntity(over.id ?? key),
    key,
    upiId: over.upiId,
    signature: over.signature,
    votes: over.votes ?? {},
    autoApplied: over.autoApplied ?? {},
    sampleNarration: over.sampleNarration ?? "",
    sourceAccountIds: over.sourceAccountIds ?? [],
    sourceAdapterIds: over.sourceAdapterIds ?? [],
    lastMatchedAt: over.lastMatchedAt ?? 0,
  }
}

/** A `TaggingData` port backed by plain arrays, scoped to one fake tenant. */
export function createFakeTaggingData(
  rules: readonly TaggingRule[] = [],
  transactions: readonly TaggingTransaction[] = [],
): TaggingData {
  return {
    rules: () => rules,
    ruleByKey: (key) => rules.find((rule) => rule.key === key),
    transactionsByKey: (key) =>
      transactions.filter((tx) => keyForNarration(tx.narration) === key),
  }
}
