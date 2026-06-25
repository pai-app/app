import { describe, it, expect, afterEach, vi } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../helpers/test-fyredb"
import { NotificationsService } from "@/services/notifications/notifications-service"
import type { Notification } from "@/entities"

function notification(over: Partial<Notification> = {}): Notification {
  return {
    kind: "import-error",
    display: "info",
    title: "Import finished",
    ...over,
  }
}

describe("NotificationsService", () => {
  let fyredb: FyreDb
  let svc: NotificationsService

  afterEach(async () => {
    svc.dispose()
    await fyredb.dispose().catch(() => {})
  })

  async function setup(): Promise<void> {
    fyredb = await createTestFyreDb()
    svc = new NotificationsService(fyredb)
  }

  it("persists an inbox notification and counts it unread", async () => {
    await setup()

    const id = svc.notify(notification(), { channels: ["inbox"] })
    expect(id).toBeDefined()

    // The global notification partition projects on a later tick; poll for it.
    await vi.waitFor(() => {
      expect(svc.notifications$.value.some((n) => n.id === id)).toBe(true)
      expect(svc.unreadCount$.value).toBe(1)
    })
  })

  it("drops the unread count when a notification is marked read", async () => {
    await setup()
    const id = svc.notify(notification(), { channels: ["inbox"] })
    if (id === undefined) throw new Error("expected an inbox id")

    svc.markRead(id)

    await vi.waitFor(() => {
      expect(svc.unreadCount$.value).toBe(0)
      expect(svc.notifications$.value.some((n) => n.id === id)).toBe(true) // still present
      expect(svc.notifications$.value.find((n) => n.id === id)?.read).toBe(true)
    })
  })

  it("clears the unread count across all notifications", async () => {
    await setup()
    svc.notify(notification({ title: "One" }), { channels: ["inbox"] })
    svc.notify(notification({ title: "Two" }), { channels: ["inbox"] })

    svc.markAllRead()

    await vi.waitFor(() => {
      expect(svc.unreadCount$.value).toBe(0)
    })
  })

  it("removes a dismissed notification", async () => {
    await setup()
    const id = svc.notify(notification(), { channels: ["inbox"] })
    if (id === undefined) throw new Error("expected an inbox id")

    svc.dismiss(id)

    await vi.waitFor(() => {
      expect(svc.notifications$.value.some((n) => n.id === id)).toBe(false)
    })
  })

  it("returns a transient id (nothing persisted) for a non-inbox notification", async () => {
    await setup()
    const id = svc.notify(notification(), { channels: ["toast"] })
    expect(id).toBeUndefined() // never written to the inbox
    expect(svc.notifications$.value).toHaveLength(0)
  })

  it("markRead is a no-op for a missing id or an already-read row", async () => {
    await setup()
    expect(() => { svc.markRead("missing") }).not.toThrow()

    const id = svc.notify(notification(), { channels: ["inbox"] })
    if (id === undefined) throw new Error("expected an inbox id")
    svc.markRead(id)
    await vi.waitFor(() => {
      expect(svc.notifications$.value.find((n) => n.id === id)?.read).toBe(true)
    })
    expect(() => { svc.markRead(id) }).not.toThrow() // already read → no-op
  })

  it("markAllRead skips rows that are already acknowledged", async () => {
    await setup()
    const first = svc.notify(notification({ title: "One" }), { channels: ["inbox"] })
    svc.notify(notification({ title: "Two" }), { channels: ["inbox"] })
    if (first === undefined) throw new Error("expected an inbox id")

    svc.markRead(first) // pre-acknowledge one row
    await vi.waitFor(() => { expect(svc.unreadCount$.value).toBe(1) })

    svc.markAllRead() // the already-read row is skipped, the other is acknowledged

    await vi.waitFor(() => { expect(svc.unreadCount$.value).toBe(0) })
  })
})
