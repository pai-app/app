/**
 * TransactionsService — the per-tenant orchestrator for transactions and
 * tagging. One instance per `FyreDb`, constructed and disposed by the service
 * registry (`ServicesProvider`).
 *
 * It owns the choke point through which all tag mutations and transaction
 * imports flow, constructs the per-tenant `TaggingEngine` with itself as the
 * `TaggingData` port, and applies the engine's verdicts/deltas synchronously
 * (no queue; decision D7). The engine reads live state through the port on
 * every call — there is no snapshot.
 *
 * Alongside the engine port reads and mutations, it exposes curated reactive
 * reads for the UI (`tagRules$`, `observeMonths`) and keeps the global
 * `tagRule` partition warm (INV-1) via a constructor subscription.
 *
 * See `docs/tagging-app-integration.md` §1 and `docs/tagging-engine-spec.md`
 * §1.
 */

import { BehaviorSubject, Subscription, type Observable } from "rxjs"
import type { FyreDb, BaseEntity, RepositoryType as Repository } from "@fyre-db/core"

import {
  transactionEntity,
  type Transaction,
} from "@/services/entities/transaction"
import {
  tagRuleEntity,
  type TagRule,
} from "@/services/entities/tag-rule"
import {
  importSourceEntity,
  type ImportSource,
  type ImportSourceDescriptor,
} from "@/services/entities/import-source"
import { TaggingEngine } from "@/services/tagging/engine"
import { buildSignature, extractUpiId, keyOf } from "@/services/tagging/extract"
import type {
  TaggingData,
  TaggingRule,
  TaggingTransaction,
  TagMutationOutcome,
  SimilarFact,
} from "@/services/tagging/types"
import type { Disposable, ReadonlySubject } from "@/services/types"

/** The result of a tag action: optional untagged look-alikes the UI MAY prompt. */
export type TagResult = { readonly similar?: SimilarFact }

/** A persisted `TagRule` row (carries the store's `BaseEntity` identity). */
export type TagRuleRow = TagRule & BaseEntity

/** A persisted `Transaction` row (carries the store's `BaseEntity` identity). */
export type TransactionRow = Transaction & BaseEntity

export class TransactionsService implements TaggingData, Disposable {
  // ── Repos (synchronous, live over the in-memory store) ──
  private readonly txRepo: Repository<Transaction>
  private readonly tagRuleRepo: Repository<TagRule>
  private readonly importSourceRepo: Repository<ImportSource>

  // The per-tenant engine, constructed with `this` as the `TaggingData` port.
  // Read by the mutation methods (`tag` / `untag` / ...).
  private readonly engine: TaggingEngine

  // Subscriptions held for the tenant's lifetime; torn down in `dispose`.
  private readonly subs = new Subscription()

  // The live, curated view of all rules for the rules UI. Backed by a
  // `BehaviorSubject` so `useObservable` can bind it with a synchronous
  // snapshot.
  private readonly tagRules = new BehaviorSubject<readonly TagRuleRow[]>([])

  constructor(fyredb: FyreDb) {
    this.txRepo = fyredb.repo(transactionEntity)
    this.tagRuleRepo = fyredb.repo(tagRuleEntity)
    this.importSourceRepo = fyredb.repo(importSourceEntity)
    this.engine = new TaggingEngine(this)
    // INV-1: keep the global `tagRule` partition warm before the first engine
    // op. If `ruleByKey` misses a rule that exists on disk, the engine
    // materializes a partial rule under the same key and LWW clobbers the rich
    // on-disk version. This subscription replaces `useLoadTagRules`.
    this.subs.add(this.tagRuleRepo.observeQuery().subscribe((rows) => { this.tagRules.next(rows) }))
  }

  // ── Reactive reads (curated view-models) ──

  /** All persisted rules for this tenant, live. */
  get tagRules$(): ReadonlySubject<readonly TagRuleRow[]> {
    return this.tagRules
  }

  /**
   * The transactions for the given month partition `keys`, live. Subscribing
   * also drives lazy partition hydration for cold months.
   */
  observeMonths(keys: readonly string[]): Observable<readonly TransactionRow[]> {
    return this.txRepo.observeQuery({ keys })
  }

  /** The import-source descriptor for a transaction's `sourceId`, if resolvable. */
  sourceDescriptor(sourceId: string | undefined): ImportSourceDescriptor | undefined {
    if (sourceId === undefined) return undefined
    return this.importSourceRepo.get(sourceId)?.descriptor
  }

  /** Set a transaction's title (manual note). No-op when the row is missing. */
  setTitle(txId: string, title: string): void {
    const tx = this.txRepo.get(txId)
    if (tx === undefined) return
    this.txRepo.save({ ...tx, title })
  }

  /** Delete a rule by its entity id (rules UI prune/delete). */
  deleteRule(id: string): void {
    this.tagRuleRepo.delete(id)
  }

  /** Tear down the tenant's subscriptions. */
  dispose(): void {
    this.subs.unsubscribe()
  }

  // ── TaggingData port (synchronous reads over the in-memory store) ──

  /** All rules for this tenant. */
  rules(): readonly TaggingRule[] {
    return this.tagRuleRepo.query()
  }

  /**
   * A single rule by its `key`. Looks up by the `key` field rather than `get`:
   * the stored entity id is the namespaced `tagRule._.<key>` (not the bare
   * `key`), so `get(key)` would always miss — silently forcing every tag down
   * the rule-materialise path and resetting counts to 1. `query({ where })`
   * matches the field directly (global entity, single in-memory partition).
   */
  ruleByKey(key: string): TaggingRule | undefined {
    return this.tagRuleRepo.query({ where: { key } })[0]
  }

  /**
   * Transactions sharing a derived key, across LOADED partitions only. Cold
   * months are invisible until a sweep — best-effort live, exact on recompute.
   */
  transactionsByKey(key: string): readonly TaggingTransaction[] {
    return this.txRepo
      .query()
      .filter(
        (t) => keyOf(extractUpiId(t.narration), buildSignature(t.narration)) === key,
      )
  }

  // ── Tag mutations (synchronous; D7 — no queue) ──

  /**
   * Tag a single row. No-op when the row is missing or already carries `tagId`.
   * Untagged rows take the human-tag path; tagged rows take the retag path.
   * Returns the engine's untagged look-alikes (if any) for an up-front prompt.
   */
  tag(txId: string, tagId: string): TagResult {
    return this.tagOne(txId, tagId)
  }

  /**
   * Clear a row's tag. No-op when the row is missing or already untagged.
   * Untag never surfaces a similar prompt, so the result is always empty.
   */
  untag(txId: string): TagResult {
    const tx = this.txRepo.get(txId)
    if (!tx || tx.tagId === undefined) return {}
    const outcome = this.engine.applyRetag(
      tx,
      undefined,
      tx.autoTagged ?? false,
      Date.now(),
      this.resolveAdapterId(tx),
    )
    this.applyOutcome(outcome)
    return {}
  }

  /**
   * Bulk-tag rows, routing each through the same per-row path as `tag` so the
   * recurrence gate and rule mutation run per row. Bulk surfaces no per-row
   * similar prompt (the UI prompts once up front; design §8.2).
   */
  tagMany(txIds: readonly string[], tagId: string): TagResult {
    for (const txId of txIds) this.tagOne(txId, tagId)
    return {}
  }

  /**
   * Accept a suggested tag. Per decision D2 this is exactly the human-tag path
   * — a suggestion accepted is just a human touch, with no special flag.
   */
  acceptSuggestion(txId: string, tagId: string): TagResult {
    return this.tag(txId, tagId)
  }

  /**
   * Save freshly-imported transactions and auto-tag the confident ones. Import
   * is the only auto-apply site in v1 (the sweep is deferred, D6). Re-import
   * idempotency: only NEW/untagged rows are auto-tagged; an existing human tag
   * is never overwritten (design §11.13).
   */
  importNewTransactions(txs: readonly Transaction[]): void {
    const now = Date.now()
    for (const tx of txs) {
      const id = this.txRepo.save(tx) // upsert by hash (deriveId)
      const saved = this.txRepo.get(id)
      if (!saved || saved.tagId !== undefined) continue // never clobber an existing tag
      const verdict = this.engine.matchTransaction(saved, now)
      if (verdict.kind === "auto") {
        this.applyOutcome(
          this.engine.applyAutoTag(saved, verdict, now, this.resolveAdapterId(saved)),
        )
      }
    }
  }

  /**
   * Apply established rules to a set of already-loaded transactions, auto-tagging
   * only the still-untagged rows that match a confident (`auto`) rule. A bounded,
   * on-demand sweep over partitions the caller has hydrated (e.g. the current
   * fiscal year) — never overwrites an existing tag. Returns the number tagged.
   */
  applyRulesToTransactions(txs: readonly TaggingTransaction[]): number {
    const now = Date.now()
    let applied = 0
    for (const tx of txs) {
      if (tx.tagId !== undefined) continue // never clobber an existing tag
      const verdict = this.engine.matchTransaction(tx, now)
      if (verdict.kind !== "auto") continue
      this.applyOutcome(this.engine.applyAutoTag(tx, verdict, now, this.resolveAdapterId(tx)))
      applied += 1
    }
    return applied
  }

  /**
   * The shared per-row tag path for `tag` and `tagMany`. Skips missing rows and
   * rows already carrying `tagId`. Untagged rows go through `applyHumanTag`;
   * rows changing tags go through `applyRetag` (a vote, not an auto-apply).
   */
  private tagOne(txId: string, tagId: string): TagResult {
    const tx = this.txRepo.get(txId)
    if (!tx || tx.tagId === tagId) return {}
    const now = Date.now()
    const adapterId = this.resolveAdapterId(tx)
    const outcome =
      tx.tagId === undefined
        ? this.engine.applyHumanTag(tx, tagId, now, adapterId)
        : this.engine.applyRetag(tx, tagId, tx.autoTagged ?? false, now, adapterId)
    this.applyOutcome(outcome)
    return { similar: outcome.similar }
  }

  /**
   * Persist an engine outcome: merge the patch onto the LIVE row (re-fetched so
   * it is never a stale projection) and apply each rule delta directly (D7).
   */
  private applyOutcome(outcome: TagMutationOutcome): void {
    const live = this.txRepo.get(outcome.txId)
    /* v8 ignore next -- the live re-fetch is defensive; the row always exists here */
    if (live) this.txRepo.save({ ...live, ...outcome.patch })
    for (const delta of outcome.ruleDeltas) {
      if (delta.op === "upsert") {
        this.tagRuleRepo.save(delta.rule)
      } else {
        // Resolve key → full namespaced entity id: `delete` (like `get`)
        // requires the stored `tagRule._.<key>` id, not the bare key.
        const matches = this.tagRuleRepo.query({ where: { key: delta.key } })
        /* v8 ignore next -- a delete delta always targets an existing rule */
        if (matches.length > 0) this.tagRuleRepo.delete(matches[0].id)
      }
    }
  }

  // ── Provenance helper (decisions D9 / review L1) ──

  /**
   * Resolves the bank/offering adapter that imported `tx`, via its
   * `importSource`. Returns `undefined` for `sourceId`-less rows (manual
   * entries) or when the source has no resolved adapter — callers degrade
   * gracefully. `adapterId` is resolved here, never stored on `Transaction`.
   */
  private resolveAdapterId(tx: Transaction): string | undefined {
    if (!tx.sourceId) return undefined
    return this.importSourceRepo.get(tx.sourceId)?.adapterId
  }
}
