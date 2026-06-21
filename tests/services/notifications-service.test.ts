import { describe, it, expect, afterEach } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../helpers/test-fyredb"
import { NotificationsService } from "@/services/notifications/notifications-service"
import type { Notification } from "@/services/entities"

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

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

    await flush() // the global notification partition projects on the next tick
    expect(svc.notifications$.value.some((n) => n.id === id)).toBe(true)
    expect(svc.unreadCount$.value).toBe(1)
  })

  it("drops the unread count when a notification is marked read", async () => {
    await setup()
    const id = svc.notify(notification(), { channels: ["inbox"] })
    if (id === undefined) throw new Error("expected an inbox id")

    svc.markRead(id)

    await flush()
    expect(svc.unreadCount$.value).toBe(0)
    expect(svc.notifications$.value.some((n) => n.id === id)).toBe(true) // still present
    expect(svc.notifications$.value.find((n) => n.id === id)?.read).toBe(true)
  })

  it("clears the unread count across all notifications", async () => {
    await setup()
    svc.notify(notification({ title: "One" }), { channels: ["inbox"] })
    svc.notify(notification({ title: "Two" }), { channels: ["inbox"] })

    svc.markAllRead()

    await flush()
    expect(svc.unreadCount$.value).toBe(0)
  })

  it("removes a dismissed notification", async () => {
    await setup()
    const id = svc.notify(notification(), { channels: ["inbox"] })
    if (id === undefined) throw new Error("expected an inbox id")

    svc.dismiss(id)

    await flush()
    expect(svc.notifications$.value.some((n) => n.id === id)).toBe(false)
  })
})
