import { describe, it, expect, vi, afterEach } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../../helpers/test-fyredb"
import { ImportContext } from "@/services/import/import-context"
import { CancelledError } from "@/services/import/import-utils"
import { accountEntity, transactionEntity } from "@/entities"

// Mock only the parse boundary; the rest of runFileImport runs for real.
const { parseFileMock } = vi.hoisted(() => ({ parseFileMock: vi.fn() }))
vi.mock("@pai-app/adapters", async (orig) => {
  const actual = await orig<typeof import("@pai-app/adapters")>()
  return { ...actual, parseFile: parseFileMock }
})

import { runFileImport } from "@/services/import/file-import-context"
import { ParseError } from "@pai-app/adapters"

describe("runFileImport — password persistence", () => {
  let fyredb: FyreDb

  afterEach(async () => {
    await fyredb.dispose().catch(() => {})
    vi.clearAllMocks()
  })

  it("persists a newly-entered password the moment it validates, even if the import is then cancelled", async () => {
    fyredb = await createTestFyreDb()
    const accountRepo = fyredb.repo(accountEntity)
    const txRepo = fyredb.repo(transactionEntity)

    // First parse attempt is locked; after the password is supplied it opens.
    parseFileMock
      .mockRejectedValueOnce(new ParseError("locked", { kind: "password-required" }))
      .mockResolvedValueOnce({
        bankId: "hdfc",
        offeringId: "savings",
        kind: "bank",
        account: { currency: "INR", accountNumber: ["123"] },
        transactions: [],
      })

    const ctx = new ImportContext()
    const onValidated = vi.fn()
    const file = { name: "s.pdf", type: "application/pdf", size: 1 } as unknown as File

    const run = runFileImport(ctx, file, [], accountRepo, txRepo, onValidated)

    // Supply the password → it validates (file opens).
    await vi.waitFor(() => { expect(ctx.prompt).toEqual({ kind: "password" }) })
    ctx.answer({ kind: "password", password: "hunter2" })

    // Then bail out at the confirm step — the import never completes.
    await vi.waitFor(() => { expect(ctx.prompt?.kind).toBe("confirm") })
    ctx.cancel()

    await expect(run).rejects.toBeInstanceOf(CancelledError)
    // The validated password was persisted on validation, not deferred to commit.
    expect(onValidated).toHaveBeenCalledWith("hunter2")
  })

  it("does not persist anything when the file opens with an already-known password", async () => {
    fyredb = await createTestFyreDb()
    const accountRepo = fyredb.repo(accountEntity)
    const txRepo = fyredb.repo(transactionEntity)

    parseFileMock.mockResolvedValueOnce({
      bankId: "hdfc",
      offeringId: "savings",
      kind: "bank",
      account: { currency: "INR", accountNumber: ["123"] },
      transactions: [],
    })

    const ctx = new ImportContext()
    const onValidated = vi.fn()
    const file = { name: "s.pdf", type: "application/pdf", size: 1 } as unknown as File

    const run = runFileImport(ctx, file, ["known"], accountRepo, txRepo, onValidated)
    await vi.waitFor(() => { expect(ctx.prompt?.kind).toBe("confirm") })
    ctx.cancel()

    await expect(run).rejects.toBeInstanceOf(CancelledError)
    expect(onValidated).not.toHaveBeenCalled()
  })
})
