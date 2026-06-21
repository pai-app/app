/**
 * NotificationsService — the per-tenant domain service for the durable
 * notification "inbox". One instance per `FyreDb` (the provider owns the
 * rebuild on tenant switch).
 *
 * It subscribes to the `Notification` repo once in the constructor and projects
 * each emission into a UI-safe, pure-data view list (`notifications$`, newest
 * first) plus the derived unread count (`unreadCount$`). The raw rows stay
 * private; the toast-channel fan-out is wired separately and is not this
 * service's concern.
 */

import { BehaviorSubject, Subscription } from "rxjs"
import type { BaseEntity, FyreDb, RepositoryType as Repository } from "@fyre-db/core"
import {
  notificationEntity,
  type Notification,
  type NotificationRef,
} from "@/services/entities/notification"
import type { Disposable, ReadonlySubject } from "@/services/types"

/** A notification as the UI sees it — never the raw row. */
export type NotificationView = {
  readonly id: string
  readonly kind: string
  readonly display: string
  readonly title: string
  readonly body?: string
  readonly read: boolean // derived: acknowledgedAt !== undefined
  readonly ref?: NotificationRef
  readonly actionLabel?: string
  readonly createdAt: number // from BaseEntity
}

type NotificationRow = Notification & BaseEntity

function toView(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    kind: row.kind,
    display: row.display,
    title: row.title,
    body: row.body,
    read: row.acknowledgedAt !== undefined,
    ref: row.ref,
    actionLabel: row.actionLabel,
    createdAt: row.createdAt.getTime(),
  }
}

/** Newest first by `createdAt` (descending). */
function byCreatedAtDesc(a: NotificationRow, b: NotificationRow): number {
  return b.createdAt.getTime() - a.createdAt.getTime()
}

export class NotificationsService implements Disposable {
  private readonly repo: Repository<Notification>
  private readonly subs = new Subscription()
  private current: readonly NotificationRow[] = []

  private readonly notifications = new BehaviorSubject<readonly NotificationView[]>([])
  private readonly unreadCount = new BehaviorSubject<number>(0)

  constructor(fyredb: FyreDb) {
    this.repo = fyredb.repo(notificationEntity)
    this.subs.add(
      this.repo.observeQuery().subscribe((rows) => {
        this.current = rows
        this.recompute()
      }),
    )
  }

  // ── Exposes ──────────────────────────────────────────────
  get notifications$(): ReadonlySubject<readonly NotificationView[]> { return this.notifications }
  get unreadCount$(): ReadonlySubject<number> { return this.unreadCount }

  // ── Ops ──────────────────────────────────────────────────
  notify(payload: Notification): string {
    return this.repo.save(payload)
  }

  dismiss(id: string): void {
    this.repo.delete(id)
  }

  markAllRead(): void {
    const now = Date.now()
    for (const row of this.current) {
      if (row.acknowledgedAt === undefined) {
        this.repo.save({ ...row, acknowledgedAt: now })
      }
    }
  }

  /** Mark a single notification read (acknowledged), if currently unread. */
  markRead(id: string): void {
    const row = this.current.find((r) => r.id === id)
    if (row === undefined || row.acknowledgedAt !== undefined) return
    this.repo.save({ ...row, acknowledgedAt: Date.now() })
  }

  dispose(): void {
    this.subs.unsubscribe()
  }

  private recompute(): void {
    const sorted = [...this.current].sort(byCreatedAtDesc)
    this.notifications.next(sorted.map(toView))
    this.unreadCount.next(this.current.filter((r) => r.acknowledgedAt === undefined).length)
  }
}
