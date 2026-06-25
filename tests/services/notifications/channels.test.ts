import { describe, it, expect, vi } from "vitest"
import {
  registerChannelEmitter,
  emitToChannel,
  type NotificationPayload,
} from "@/services/notifications/channels"
import { resolveDisplay } from "@/services/notifications/registry"
import type { Notification } from "@/services/entities"

const NOTE: Notification = { kind: "import-error", display: "info", title: "x" }

function payload(): NotificationPayload {
  return { id: "n1", notification: NOTE, display: resolveDisplay("info"), channels: ["toast"] }
}

describe("channel emitters", () => {
  it("emits to a registered channel and stops after unregister", () => {
    const emitter = vi.fn()
    const unregister = registerChannelEmitter("toast", emitter)

    emitToChannel("toast", payload())
    expect(emitter).toHaveBeenCalledTimes(1)

    unregister()
    emitToChannel("toast", payload())
    expect(emitter).toHaveBeenCalledTimes(1) // no further calls after unregister
  })

  it("is a no-op to emit to a channel with no registered emitter", () => {
    expect(() => { emitToChannel("push", payload()) }).not.toThrow()
  })

  it("unregister only removes the emitter when it is still the current one", () => {
    const first = vi.fn()
    const second = vi.fn()
    const unregisterFirst = registerChannelEmitter("toast", first)
    registerChannelEmitter("toast", second) // replaces `first`

    unregisterFirst() // `first` is no longer current → must NOT remove `second`

    emitToChannel("toast", payload())
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })
})
