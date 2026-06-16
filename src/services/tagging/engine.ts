/**
 * The tagging engine — a per-tenant class owning all tagging logic.
 *
 * Depends only on the injected `TaggingData` port: it reads live state via
 * `this.data` (never a passed-in snapshot) and the clock is always injected as
 * a `now` parameter. Deterministic and side-effect free — it computes and
 * returns verdicts/outcomes, but never writes (the service persists).
 *
 * Holds `matchTransaction` (T7), the rule-mutation methods (T8), and the bulk /
 * lookup helpers (T9: `matchMany`, `findSimilarUntagged`). The mutations compute
 * — but never persist — how a tag action changes the rules; the service applies
 * the returned deltas.
 *
 * The module-level pure helpers live in `./engine-internals`; this file holds
 * only the class.
 *
 * See `docs/tagging-engine-spec.md` §1, §6, §7 and
 * `docs/auto-tagging-design.md` §4.1, §5, §7.
 */

import { TAGGING } from "./constants";
import {
  bump,
  isBetterCandidate,
  materialise,
  scoreRule,
  strengthen,
  upsertOrDelete,
  verdictFor,
} from "./engine-internals";
import { buildSignature, extractUpiId, keyOf } from "./extract";

import type { Candidate } from "./engine-internals";
import type { TagRule } from "../entities/tag-rule";
import type {
  MatchVerdict,
  RuleDelta,
  SimilarFact,
  TagMutationOutcome,
  TagPatch,
  TaggingData,
  TaggingTransaction,
} from "./types";

export class TaggingEngine {
  // The injected data port. Kept as an explicit field + constructor assignment
  // (not the `constructor(private readonly data)` shorthand) because the repo's
  // `erasableSyntaxOnly` forbids parameter properties.
  private readonly data: TaggingData;

  constructor(data: TaggingData) {
    this.data = data;
  }

  /**
   * Scores `tx` against every learned rule and returns a graded verdict
   * (`auto` / `suggest` / `none`). Reads the rule set live via the port and
   * takes the clock as `now`; it never applies the verdict.
   *
   * See `docs/tagging-engine-spec.md` §6 and `docs/auto-tagging-design.md` §7.1.
   */
  matchTransaction(tx: TaggingTransaction, now: number): MatchVerdict {
    const txUpiId = extractUpiId(tx.narration);
    const txSignature = buildSignature(tx.narration);

    let best: Candidate | undefined;
    for (const rule of this.data.rules()) {
      const candidate = scoreRule(rule, txUpiId, txSignature);
      if (candidate && (!best || isBetterCandidate(candidate, best))) {
        best = candidate;
      }
    }

    return best ? verdictFor(best, now) : { kind: "none" };
  }

  /**
   * Classifies a batch of transactions in one pass, reading the rule set live
   * via the port. Returns a map from `tx.id` to its `MatchVerdict`; the clock is
   * injected once as `now`. Never applies any verdict.
   *
   * See `docs/tagging-engine-spec.md` §8.
   */
  matchMany(txs: readonly TaggingTransaction[], now: number): Map<string, MatchVerdict> {
    const verdicts = new Map<string, MatchVerdict>();
    for (const tx of txs) {
      verdicts.set(tx.id, this.matchTransaction(tx, now));
    }
    return verdicts;
  }

  /**
   * Ids of exact-key untagged look-alikes for `key` (D8 exact-key via the port,
   * loaded partitions only), preserving the port's order. Unlike
   * `untaggedSiblings` this keeps `tagId === undefined` rows without excluding a
   * source row.
   *
   * See `docs/tagging-engine-spec.md` §8.
   */
  findSimilarUntagged(key: string): readonly string[] {
    return this.data
      .transactionsByKey(key)
      .filter((t) => t.tagId === undefined)
      .map((t) => t.id);
  }

  /**
   * A human applies `tagId` to `tx` (fresh tag or accepted suggestion — there is
   * no separate acceptance path, D2). Strengthens an existing rule's `votes`, or
   * materialises a new rule only when the key recurs (≥2 sharing it incl. `tx`,
   * D3 — no back-fill). A lone key yields the patch with no rule delta. When a
   * rule is in play, reports exact-key untagged look-alikes (D8).
   *
   * See `docs/auto-tagging-design.md` §4.1, §5 and engine-spec §7.
   */
  applyHumanTag(
    tx: TaggingTransaction,
    tagId: string,
    now: number,
    adapterId?: string,
  ): TagMutationOutcome {
    const upiId = extractUpiId(tx.narration);
    const signature = buildSignature(tx.narration);
    const key = keyOf(upiId, signature);
    const existing = this.data.ruleByKey(key);

    let ruleDeltas: readonly RuleDelta[] = [];
    let formed = false;
    if (existing) {
      const rule = strengthen(existing, { votes: bump(existing.votes, tagId, 1) }, tx, adapterId, now);
      ruleDeltas = [{ op: "upsert", rule }];
      formed = true;
    } else if (this.data.transactionsByKey(key).length >= TAGGING.RECURRENCE_MIN) {
      const rule = materialise(key, upiId, signature, tagId, tx, adapterId, now);
      ruleDeltas = [{ op: "upsert", rule }];
      formed = true;
    }

    const patch: TagPatch = { tagId, autoTagged: false };
    const similar = formed ? this.untaggedSiblings(key, tx.id, tagId) : undefined;
    return { txId: tx.id, patch, ruleDeltas, ...(similar ? { similar } : {}) };
  }

  /**
   * The engine's own `auto` verdict is being applied to `tx`. Credits the
   * winning tag's `autoApplied` count (an uncorrected auto-apply) and marks the
   * patch with the sparkle. Always strengthens the winning rule (D1 bump).
   */
  applyAutoTag(
    tx: TaggingTransaction,
    verdict: Extract<MatchVerdict, { kind: "auto" }>,
    now: number,
    adapterId?: string,
  ): TagMutationOutcome {
    const rule = strengthen(
      verdict.rule,
      { autoApplied: bump(verdict.rule.autoApplied, verdict.tagId, 1) },
      tx,
      adapterId,
      now,
    );
    const patch: TagPatch = { tagId: verdict.tagId, autoTagged: true };
    return { txId: tx.id, patch, ruleDeltas: [{ op: "upsert", rule }] };
  }

  /**
   * A human changes or clears `tx`'s tag. Debits the FROM tag from the correct
   * histogram (`autoApplied` if it was an auto-apply, else `votes`) and, when
   * `toTagId` is set, credits `votes` (a human touch always votes). Drops the
   * rule when its combined strength hits zero. Retag never materialises a rule.
   *
   * See the §4.1 / engine-spec §7 histogram table.
   */
  applyRetag(
    tx: TaggingTransaction,
    toTagId: string | undefined,
    wasAuto: boolean,
    now: number,
    adapterId?: string,
  ): TagMutationOutcome {
    const fromTag = tx.tagId;
    const key = keyOf(extractUpiId(tx.narration), buildSignature(tx.narration));
    const existing = this.data.ruleByKey(key);

    let ruleDeltas: readonly RuleDelta[] = [];
    if (existing && fromTag !== undefined) {
      let { votes, autoApplied } = existing;
      if (wasAuto) autoApplied = bump(autoApplied, fromTag, -1);
      else votes = bump(votes, fromTag, -1);
      if (toTagId !== undefined) votes = bump(votes, toTagId, 1);
      const rule = strengthen(existing, { votes, autoApplied }, tx, adapterId, now);
      ruleDeltas = [upsertOrDelete(rule)];
    }

    const patch: TagPatch = { tagId: toTagId, autoTagged: false };
    return { txId: tx.id, patch, ruleDeltas };
  }

  /**
   * `tx` is being deleted: debit its own contribution from its rule (from
   * `autoApplied` if it was auto-tagged, else `votes`). Removal is not a match,
   * so `lastMatchedAt` is NOT bumped (D1). Drops the rule at zero strength. The
   * patch is moot (the row is going away).
   *
   * See `docs/auto-tagging-design.md` §11.14 and engine-spec §7.
   */
  applyTransactionRemoved(tx: TaggingTransaction): TagMutationOutcome {
    const key = keyOf(extractUpiId(tx.narration), buildSignature(tx.narration));
    const existing = this.data.ruleByKey(key);

    let ruleDeltas: readonly RuleDelta[] = [];
    if (existing && tx.tagId !== undefined) {
      let { votes, autoApplied } = existing;
      if (tx.autoTagged) autoApplied = bump(autoApplied, tx.tagId, -1);
      else votes = bump(votes, tx.tagId, -1);
      const rule: TagRule = { ...existing, votes, autoApplied };
      ruleDeltas = [upsertOrDelete(rule)];
    }

    return { txId: tx.id, patch: {}, ruleDeltas };
  }

  /**
   * Exact-key untagged look-alikes for the bulk-tag prompt: ids of transactions
   * sharing `key` (loaded partitions only) that are untagged and not `txId`
   * itself (D8 exact-key, not fuzzy). `undefined` when there are none.
   */
  private untaggedSiblings(key: string, txId: string, tagId: string): SimilarFact | undefined {
    const transactionIds = this.data
      .transactionsByKey(key)
      .filter((t) => t.id !== txId && t.tagId === undefined)
      .map((t) => t.id);
    return transactionIds.length > 0 ? { tagId, transactionIds } : undefined;
  }
}
