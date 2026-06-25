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
import { notificationEntity } from "@/services/store/schema/notification"
import type {
  Notification,
  NotificationRef,
} from "@/entities/notification"
import { resolveDisplay, resolveKind, type NotificationChannel } from "./registry"
import { emitToChannel, type NotificationPayload } from "./channels"
import type { Disposable, ReadonlySubject } from "@/services/types"

/** Per-call overrides. `channels` overrides the kind's default delivery policy. */
export type NotifyOptions = {
  readonly channels?: readonly NotificationChannel[]
}

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
  /**
   * Produce a notification — the single fan-out point for every producer.
   * Resolves the kind's channels + display, persists an `inbox` row when
   * targeted, and emits to the transient channels (toast, …). Returns the inbox
   * row id when persisted, else `undefined`.
   */
  notify(notification: Notification, options?: NotifyOptions): string | undefined {
    const channels = options?.channels ?? resolveKind(notification.kind).channels
    const display = resolveDisplay(notification.display)

    let id: string | undefined
    if (channels.includes("inbox")) {
      id = this.repo.save(notification)
    }

    const payload: NotificationPayload = {
      id: id ?? crypto.randomUUID(),
      notification,
      display,
      channels,
    }
    for (const channel of channels) {
      if (channel !== "inbox") emitToChannel(channel, payload)
    }

    return id
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
    const row = this.repo.get(id)
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
