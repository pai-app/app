/**
 * Tagging engine port + output types.
 *
 * The `TaggingData` port is the engine's ONLY dependency on storage: a small
 * synchronous interface the app implements over fyre-db, scoped to one tenant.
 * The output types are the engine's verdicts and patches — it computes and
 * returns these, but never writes (the service persists).
 *
 * Per decision D9, the port returns the APP entity shapes (`Transaction` /
 * `TagRule` widened with `BaseEntity`), imported type-only. There is no
 * separate `EngineTx`. The output types here are engine-owned, not entity
 * duplicates.
 *
 * See `docs/tagging-engine-spec.md` §1, §2 and `docs/auto-tagging-design.md`
 * §7.0.
 */

import type { BaseEntity } from "@fyre-db/core";

import type { Transaction } from "@/entities/transaction";
import type { TagRule } from "@/entities/tag-rule";

/** App transaction row, as the engine sees it through the port. */
export type TaggingTransaction = Transaction & BaseEntity;

/** App tag-rule row, as the engine sees it through the port. */
export type TaggingRule = TagRule & BaseEntity;

/**
 * The data port — the engine's ONLY dependency on storage. Synchronous, reads
 * the in-memory store live on every call (no snapshot). Scoped to one tenant.
 */
export interface TaggingData {
  /** All rules for this tenant. */
  rules(): readonly TaggingRule[];
  /** A single rule by its `key`, or `undefined` if none. */
  ruleByKey(key: string): TaggingRule | undefined;
  /**
   * Transactions sharing a key, across LOADED partitions only (recurrence /
   * similar detection). Cold months are invisible until a sweep — best-effort
   * live, exact on recompute.
   */
  transactionsByKey(key: string): readonly TaggingTransaction[];
}

/**
 * The engine's classification of a transaction against the learned rules.
 * `auto` ⇒ apply the tag; `suggest` ⇒ offer it; `none` ⇒ no confident match.
 * The engine never acts on the verdict.
 */
export type MatchVerdict =
  | { kind: "auto"; tagId: string; confidence: number; rule: TaggingRule }
  | { kind: "suggest"; tagId: string; confidence: number; rule: TaggingRule }
  | { kind: "none" };

/**
 * A rule change the engine wants persisted. `upsert` carries the new desired
 * rule state; `delete` names the rule key to drop.
 */
export type RuleDelta =
  | { op: "upsert"; rule: TagRule }
  | { op: "delete"; key: string };

/** Untagged look-alikes the app MAY prompt to bulk-tag (loaded partitions only). */
export type { SimilarFact } from "@/views/similar-fact"
import type { SimilarFact } from "@/views/similar-fact"

/**
 * The minimal tag patch the engine owns. The service merges this onto the live
 * row so the engine can never clobber fields it doesn't own (amount, hash,
 * sourceId, title).
 */
export type TagPatch = { readonly tagId?: string; readonly autoTagged?: boolean };

/** The result of a rule mutation: the row patch, rule deltas, and optional look-alikes. */
export type TagMutationOutcome = {
  readonly txId: string;
  readonly patch: TagPatch;
  readonly ruleDeltas: readonly RuleDelta[];
  readonly similar?: SimilarFact;
};
