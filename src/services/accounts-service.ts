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
import {
  moneyAccountEntity,
  type AccountStatement,
  type MoneyAccount,
  type MoneyAccountKind,
} from "@/services/entities"
import type { Disposable, ReadonlySubject } from "@/services/types"

/** A money account as the UI sees it — never the raw row. */
export type AccountView = {
  readonly id: string
  readonly name: string
  readonly kind: MoneyAccountKind
  readonly icon?: string
  readonly currency: string
  readonly maskedNumber?: string // "****1234" from metadata.accountNumber, else undefined
  readonly bankId?: string
  readonly statement?: AccountStatement // latest closing-figure snapshot, if any
  readonly archived: boolean
}

/**
 * Full, on-demand account detail for verification surfaces (the home card).
 * The ONLY view that carries raw `metadata` out of the service — kept explicit
 * and read synchronously, never streamed.
 */
export type AccountDetails = {
  readonly id: string
  readonly name: string
  readonly kind: MoneyAccountKind
  readonly icon?: string
  readonly currency: string
  readonly statement?: AccountStatement
  readonly bankId?: string
  readonly offeringId?: string
  readonly archived: boolean
  readonly metadata: Record<string, readonly string[]>
}

/**
 * The structural subset of a money account the account icon needs. Both the raw
 * `MoneyAccount` row and the UI-safe `AccountView` satisfy this, so every call
 * site — raw-row or view-model — works without conversion. Lives in the service
 * layer so views (and synthetic account tags) can carry it without the UI
 * depending back on the service.
 */
export type AccountIconData = {
  readonly icon?: string
  readonly bankId?: string
  readonly kind: MoneyAccountKind
}

/** Pure account-tag data (the React icon is reattached at the UI edge). */
export type AccountTagData = {
  readonly id: string // `account-<accountId>`
  readonly accountId: string
  readonly name: string // "Name ****1234"
  readonly icon?: string
  readonly kind: MoneyAccountKind
  readonly bankId?: string
  readonly parent: "system-tag-selftransfer"
}

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
  return {
    id: `account-${row.id}`,
    accountId: row.id,
    name: masked ? `${row.name} ${masked}` : row.name,
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
