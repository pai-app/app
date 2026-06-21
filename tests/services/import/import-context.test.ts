import { describe, it, expect } from "vitest"
import { firstValueFrom } from "rxjs"
import {
  ImportContext,
  type ContextPrompt,
  type ContextStatus,
} from "@/services/import/import-context"

describe("ImportContext lifecycle", () => {
  it("starts pending and emits the current status to subscribers", async () => {
    const ctx = new ImportContext()
    expect(ctx.status).toBe("pending")
    expect(await firstValueFrom(ctx.observeStatus())).toBe("pending")
    ctx.dispose()
  })

  it("emits each status transition in order", () => {
    const ctx = new ImportContext()
    const seen: ContextStatus[] = []
    const sub = ctx.observeStatus().subscribe((s) => seen.push(s))

    ctx.status = "in_progress"
    ctx.status = "completed"

    expect(seen).toEqual(["pending", "in_progress", "completed"])
    sub.unsubscribe()
    ctx.dispose()
  })

  it("suspends on a prompt and resumes with the user's answer", async () => {
    const ctx = new ImportContext()
    const prompt: ContextPrompt = { kind: "password" }

    const pending = ctx.waitForAnswer(prompt)
    expect(ctx.status).toBe("needs_input")
    expect(ctx.prompt).toEqual(prompt)

    ctx.answer({ kind: "password", password: "hunter2" })

    expect(await pending).toEqual({ kind: "password", password: "hunter2" })
    expect(ctx.prompt).toBeNull() // cleared on answer
  })

  it("cancel marks cancelled, transitions status, and unblocks a pending prompt", async () => {
    const ctx = new ImportContext()
    const pending = ctx.waitForAnswer({ kind: "password" })

    ctx.cancel()

    expect(ctx.isCancelled()).toBe(true)
    expect(ctx.status).toBe("cancelled")
    expect(await pending).toEqual({ kind: "confirm", confirmed: false })
  })

  it("cancel without a pending prompt still flips state", () => {
    const ctx = new ImportContext()
    ctx.cancel()
    expect(ctx.isCancelled()).toBe(true)
    expect(ctx.status).toBe("cancelled")
    ctx.dispose()
  })

  it("answer is a no-op when nothing is waiting", () => {
    const ctx = new ImportContext()
    expect(() => { ctx.answer({ kind: "confirm", confirmed: true }) }).not.toThrow()
    expect(ctx.prompt).toBeNull()
    ctx.dispose()
  })

  it("completes the status stream on dispose", () => {
    const ctx = new ImportContext()
    let completed = false
    ctx.observeStatus().subscribe({ complete: () => { completed = true } })
    ctx.dispose()
    expect(completed).toBe(true)
  })
})
