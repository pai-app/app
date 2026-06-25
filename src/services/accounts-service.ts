/**
 * AccountsService — the per-tenant domain service for money accounts. One
 * instance per `FyreDb` (the provider owns the rebuild on tenant switch).
 *
 * It subscribes to the `MoneyAccount` repo once in the constructor and projects
 * each emission into two UI-safe, pure-data views: the masked account list
 * (`accounts$`) and the synthetic "account tags" (`accountTags$`) — the same
 * read-time projection the old `use-load-accounts` / `use-load-tags` hooks did,
 * minus all React. The raw rows are held privately for `get`-style reads and the
 * on-demand `revealAccountNumber`.
 */

import { BehaviorSubject, Subscription } from "rxjs"
import type { BaseEntity, FyreDb, RepositoryType as Repository } from "@fyre-db/core"
import { moneyAccountEntity } from "@/services/store/schema"
import type { MoneyAccount } from "@/entities"
import type { Disposable, ReadonlySubject } from "@/services/types"
import type {
  AccountView,
  AccountDetails,
  AccountTagData,
} from "@/entities/account-view"

export type {
  AccountView,
  AccountDetails,
  AccountIconData,
  AccountTagData,
} from "@/entities/account-view"

type AccountRow = MoneyAccount & BaseEntity

// `metadata` is typed non-optional, but legacy rows created before it became
// mandatory may omit it (and individual keys) at runtime. These helpers take
// the bag/array as parameters typed `| undefined` so the runtime guards stay
// honest without a cast — parameter types are not narrowed by the call site.

/** Null-safe read of an account's stored numbers from a maybe-absent metadata bag. */
function valuesFor(
  bag: Record<string, readonly string[] | undefined> | undefined,
  key: string,
): readonly string[] {
  return bag?.[key] ?? []
}

/** The metadata bag, defaulting to empty (legacy rows may lack it). */
function metadataOf(
  bag: Record<string, readonly string[]> | undefined,
): Record<string, readonly string[]> {
  return bag ?? {}
}

/** First element as a maybe-undefined value (param typing keeps the optional). */
function firstOf(list: readonly string[]): string | undefined {
  return list[0]
}

/** Null-safe read of an account's stored numbers (legacy rows may lack metadata). */
function accountNumbersOf(row: AccountRow): readonly string[] {
  return valuesFor(row.metadata, "accountNumber")
}

/** First stored account number, masked to "****" + last 4 (≥ 4 digits), else undefined. */
function maskAccountNumber(row: AccountRow): string | undefined {
  const first = firstOf(accountNumbersOf(row))
  if (first === undefined || first.length < 4) return undefined
  return `****${first.slice(-4)}`
}

/** Whether an account carries a full account number (length ≥ 4) — tag-worthy. */
function hasFullDetails(row: AccountRow): boolean {
  return maskAccountNumber(row) !== undefined
}

function toAccountView(row: AccountRow): AccountView {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    icon: row.icon,
    currency: row.currency,
    maskedNumber: maskAccountNumber(row),
    bankId: row.bankId,
    statement: row.statement,
    archived: row.archived ?? false,
  }
}

function toAccountDetails(row: AccountRow): AccountDetails {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    icon: row.icon,
    currency: row.currency,
    statement: row.statement,
    bankId: row.bankId,
    offeringId: row.offeringId,
    archived: row.archived ?? false,
    metadata: metadataOf(row.metadata),
  }
}

function toAccountTagData(row: AccountRow): AccountTagData {
  const masked = maskAccountNumber(row)
  // Only invoked for rows passing `hasFullDetails`, so `masked` is always
  // defined here; the bare-name fallback is unreachable.
  /* v8 ignore next */
  const name = masked ? `${row.name} ${masked}` : row.name
  return {
    id: `account-${row.id}`,
    accountId: row.id,
    name,
    icon: row.icon,
    kind: row.kind,
    bankId: row.bankId,
    parent: "system-tag-selftransfer",
  }
}

export class AccountsService implements Disposable {
  private readonly repo: Repository<MoneyAccount>
  private readonly subs = new Subscription()
  private current: readonly AccountRow[] = []

  private readonly accounts = new BehaviorSubject<readonly AccountView[]>([])
  private readonly accountTags = new BehaviorSubject<readonly AccountTagData[]>([])

  constructor(fyredb: FyreDb) {
    this.repo = fyredb.repo(moneyAccountEntity)
    this.subs.add(
      this.repo.observeQuery().subscribe((rows) => {
        this.current = rows
        this.recompute()
      }),
    )
  }

  // ── Exposes ──────────────────────────────────────────────
  get accounts$(): ReadonlySubject<readonly AccountView[]> { return this.accounts }
  get accountTags$(): ReadonlySubject<readonly AccountTagData[]> { return this.accountTags }

  /** Currency of a live account, or undefined when unknown. */
  currencyOf(id: string): string | undefined {
    return this.current.find((r) => r.id === id)?.currency
  }

  /** On-demand: the full first account number (import/reveal flows only). */
  revealAccountNumber(id: string): string | undefined {
    const row = this.current.find((r) => r.id === id)
    if (row === undefined) return undefined
    return firstOf(accountNumbersOf(row))
  }

  /** On-demand: full account detail for verification surfaces, or undefined. */
  getAccountDetails(id: string): AccountDetails | undefined {
    const row = this.current.find((r) => r.id === id)
    if (row === undefined) return undefined
    return toAccountDetails(row)
  }

  // ── Ops ──────────────────────────────────────────────────
  create(input: MoneyAccount): string {
    return this.repo.save(input)
  }

  update(id: string, patch: Partial<MoneyAccount>): void {
    const row = this.repo.get(id)
    if (row === undefined) return
    this.repo.save({ ...row, ...patch })
  }

  archive(id: string): void {
    this.update(id, { archived: true })
  }

  restore(id: string): void {
    this.update(id, { archived: false })
  }

  /** Union the given arrays into the row's metadata (dedupe per key), then save. */
  mergeMetadata(id: string, meta: Record<string, readonly string[]>): void {
    const row = this.repo.get(id)
    if (row === undefined) return
    const merged: Record<string, readonly string[]> = { ...row.metadata }
    for (const [key, values] of Object.entries(meta)) {
      merged[key] = [...new Set([...valuesFor(merged, key), ...values])]
    }
    this.repo.save({ ...row, metadata: merged })
  }

  // TODO: `resolveOrCreateForImport` lands when ImportService is folded in.

  dispose(): void {
    this.subs.unsubscribe()
  }

  private recompute(): void {
    this.accounts.next(this.current.map(toAccountView))
    this.accountTags.next(
      this.current.filter((r) => !r.archived && hasFullDetails(r)).map(toAccountTagData),
    )
  }
}
