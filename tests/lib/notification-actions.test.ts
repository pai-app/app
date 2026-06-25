import { describe, it, expect, vi } from "vitest"
import {
  registerNotificationAction,
  registerNotificationFallback,
  runNotificationAction,
} from "@/providers/notification-actions"
import type { NotificationRef } from "@/entities/notification"

const importLogRef: NotificationRef = { type: "import-log", logId: "log-1" }

describe("notification action registry", () => {
  it("runs the registered handler for a matching ref", () => {
    const handler = vi.fn()
    const off = registerNotificationAction("import-log", handler)

    runNotificationAction(importLogRef)

    expect(handler).toHaveBeenCalledExactlyOnceWith(importLogRef)
    off()
  })

  it("stops invoking the handler after it is unregistered", () => {
    const handler = vi.fn()
    const off = registerNotificationAction("import-log", handler)
    off()

    runNotificationAction(importLogRef)

    expect(handler).not.toHaveBeenCalled()
  })

  it("falls back when no handler matches the ref", () => {
    const fallback = vi.fn()
    const off = registerNotificationFallback(fallback)

    runNotificationAction(importLogRef) // no action handler registered

    expect(fallback).toHaveBeenCalledOnce()
    off()
  })

  it("falls back when there is no ref at all", () => {
    const fallback = vi.fn()
    const off = registerNotificationFallback(fallback)

    runNotificationAction(undefined)

    expect(fallback).toHaveBeenCalledOnce()
    off()
  })

  it("unregistering the fallback makes an unmatched run a no-op", () => {
    const fallback = vi.fn()
    const off = registerNotificationFallback(fallback)
    off()

    expect(() => { runNotificationAction(undefined) }).not.toThrow()
    expect(fallback).not.toHaveBeenCalled()
  })

  it("prefers a registered handler over the fallback", () => {
    const handler = vi.fn()
    const fallback = vi.fn()
    const offHandler = registerNotificationAction("import-log", handler)
    const offFallback = registerNotificationFallback(fallback)

    runNotificationAction(importLogRef)

    expect(handler).toHaveBeenCalledOnce()
    expect(fallback).not.toHaveBeenCalled()
    offHandler()
    offFallback()
  })

  it("a stale handler's unregister is a no-op after it was replaced", () => {
    const first = vi.fn()
    const second = vi.fn()
    const offFirst = registerNotificationAction("import-log", first)
    const offSecond = registerNotificationAction("import-log", second) // replaces first
    offFirst() // stale — must NOT remove `second`

    runNotificationAction(importLogRef)

    expect(second).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()
    offSecond()
  })

  it("a stale fallback's unregister is a no-op after it was replaced", () => {
    const first = vi.fn()
    const second = vi.fn()
    const offFirst = registerNotificationFallback(first)
    const offSecond = registerNotificationFallback(second) // replaces first
    offFirst() // stale — must NOT clear `second`

    runNotificationAction(undefined)

    expect(second).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()
    offSecond()
  })
})
