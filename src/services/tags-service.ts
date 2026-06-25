/**
 * TagsService — the per-tenant domain service for tags. One instance per
 * `FyreDb` (the provider owns the rebuild on tenant switch).
 *
 * It composes `AccountsService`: user tags come from the `Tag` repo, system
 * tags from the `SYSTEM_TAGS` constant, and synthetic account tags from
 * `accounts.accountTags$`. Each source is projected into the pure-data
 * `TagView` (no React/JSX) — the same read-time tag list the old
 * `use-load-tags` hook produced, minus the icon renderer. Any custom React
 * icon is reattached at the UI edge (account tags carry `accountId` for that).
 */

import { BehaviorSubject, Subscription } from "rxjs"
import type { BaseEntity, FyreDb, RepositoryType as Repository } from "@fyre-db/core"
import { tagEntity } from "@/services/store/schema"
import { SYSTEM_TAGS, type Tag } from "@/entities"
import type { Disposable, ReadonlySubject } from "@/services/types"
import type {
  AccountsService,
  AccountTagData,
} from "@/services/accounts-service"
import type { TagView, TagNode } from "@/entities/tag-view"

export type { TagView, TagNode } from "@/entities/tag-view"

type TagRow = Tag & BaseEntity

function systemTagToView(tag: Tag & { readonly id: string }): TagView {
  return {
    id: tag.id,
    name: tag.name,
    icon: tag.icon,
    description: tag.description,
    parent: tag.parent,
  }
}

function userTagToView(row: TagRow): TagView {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    parent: row.parent,
  }
}

function accountTagToView(tag: AccountTagData): TagView {
  return {
    id: tag.id,
    name: tag.name,
    icon: tag.icon ?? "",
    parent: tag.parent,
    accountId: tag.accountId,
    account: { icon: tag.icon, bankId: tag.bankId, kind: tag.kind },
  }
}

export class TagsService implements Disposable {
  private readonly repo: Repository<Tag>
  private readonly subs = new Subscription()
  private userTags: readonly TagRow[] = []
  private accountTags: readonly AccountTagData[] = []

  private readonly displayTags = new BehaviorSubject<readonly TagView[]>([])
  private readonly tagTree = new BehaviorSubject<readonly TagNode[]>([])

  constructor(fyredb: FyreDb, accounts: AccountsService) {
    this.repo = fyredb.repo(tagEntity)
    this.subs.add(
      this.repo.observeQuery().subscribe((rows) => {
        this.userTags = rows
        this.recompute()
      }),
    )
    this.subs.add(
      accounts.accountTags$.subscribe((tags) => {
        this.accountTags = tags
        this.recompute()
      }),
    )
  }

  // ── Exposes ──────────────────────────────────────────────
  get displayTags$(): ReadonlySubject<readonly TagView[]> { return this.displayTags }
  get tagTree$(): ReadonlySubject<readonly TagNode[]> { return this.tagTree }

  // ── Ops ──────────────────────────────────────────────────
  create(input: Tag): string {
    return this.repo.save(input)
  }

  rename(id: string, name: string): void {
    const row = this.repo.get(id)
    if (row === undefined) return
    this.repo.save({ ...row, name })
  }

  setIcon(id: string, icon: string): void {
    const row = this.repo.get(id)
    if (row === undefined) return
    this.repo.save({ ...row, icon })
  }

  delete(id: string): void {
    // TODO: on delete, ask TransactionsService to scrub this tag from rule
    // histograms (design §11.7). Wired when TransactionsService is folded in.
    this.repo.delete(id)
  }

  dispose(): void {
    this.subs.unsubscribe()
  }

  private recompute(): void {
    // Ordering mirrors `use-load-tags`: system tags (configured order), then
    // user tags alphabetical by name, then synthetic account tags.
    const sortedUserTags = [...this.userTags].sort((a, b) => a.name.localeCompare(b.name))
    const views: readonly TagView[] = [
      ...SYSTEM_TAGS.map(systemTagToView),
      ...sortedUserTags.map(userTagToView),
      ...this.accountTags.map(accountTagToView),
    ]
    this.displayTags.next(views)
    this.tagTree.next(buildTree(views))
  }
}

/**
 * Group the flat display tags into a parent→children tree. Roots are tags with
 * no `parent` or whose parent isn't present in the list; every other tag is
 * attached as a direct child of its parent. One level of nesting only —
 * grandchildren collapse under their nearest present root since the system tag
 * taxonomy is two levels deep by design.
 */
function buildTree(views: readonly TagView[]): readonly TagNode[] {
  const byId = new Map<string, TagView>(views.map((v) => [v.id, v]))
  const childrenByParent = new Map<string, TagView[]>()
  const roots: TagView[] = []
  for (const view of views) {
    const parentId = view.parent
    if (parentId !== undefined && byId.has(parentId)) {
      const bucket = childrenByParent.get(parentId) ?? []
      bucket.push(view)
      childrenByParent.set(parentId, bucket)
    } else {
      roots.push(view)
    }
  }
  return roots.map((root) => ({ ...root, children: childrenByParent.get(root.id) ?? [] }))
}
