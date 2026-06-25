import { describe, it, expect, afterEach } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../helpers/test-fyredb"
import { AccountsService } from "@/services/accounts-service"
import { accountEntity } from "@/entities"
import type { Account } from "@/entities"

const SAMPLE: Account = {
  kind: "bank",
  name: "Test Bank",
  currency: "INR",
  metadata: { accountNumber: ["1234567890"] },
}

describe("AccountsService", () => {
  let fyredb: FyreDb
  let svc: AccountsService

  afterEach(async () => {
    svc.dispose()
    await fyredb.dispose().catch(() => {})
  })

  async function setup(): Promise<void> {
    fyredb = await createTestFyreDb()
    svc = new AccountsService(fyredb)
  }

  it("projects a masked account view exposing only the last 4 digits", async () => {
    await setup()
    fyredb.repo(accountEntity).save(SAMPLE)

    const accounts = svc.accounts$.value
    expect(accounts).toHaveLength(1)
    expect(accounts[0].name).toBe("Test Bank")
    expect(accounts[0].maskedNumber).toBe("****7890")
    // The raw number must never leak onto the view model.
    expect(JSON.stringify(accounts[0])).not.toContain("1234567890")
  })

  it("reveals the full number + metadata only via the on-demand readers", async () => {
    await setup()
    const id = fyredb.repo(accountEntity).save(SAMPLE)

    expect(svc.revealAccountNumber(id)).toBe("1234567890")
    expect(svc.getAccountDetails(id)?.metadata.accountNumber).toEqual(["1234567890"])
  })

  it("synthesises a self-transfer account tag for accounts carrying a number", async () => {
    await setup()
    fyredb.repo(accountEntity).save(SAMPLE)

    const tags = svc.accountTags$.value
    expect(tags).toHaveLength(1)
    expect(tags[0].name).toContain("****7890")
    expect(tags[0].parent).toBe("system-tag-selftransfer")
  })

  it("omits the synthetic tag for archived accounts", async () => {
    await setup()
    fyredb.repo(accountEntity).save({ ...SAMPLE, archived: true })

    expect(svc.accountTags$.value).toHaveLength(0)
    expect(svc.accounts$.value).toHaveLength(1) // still listed, just not tag-worthy
  })

  it("merges metadata with per-key dedupe", async () => {
    await setup()
    const id = fyredb.repo(accountEntity).save(SAMPLE)

    svc.mergeMetadata(id, { accountNumber: ["1234567890"], ifscCode: ["HDFC0001"] })

    const meta = svc.getAccountDetails(id)?.metadata
    expect(meta?.accountNumber).toEqual(["1234567890"]) // deduped, not duplicated
    expect(meta?.ifscCode).toEqual(["HDFC0001"])
  })

  it("creates an account and returns its id", async () => {
    await setup()
    const id = svc.create(SAMPLE)
    expect(fyredb.repo(accountEntity).get(id)?.name).toBe("Test Bank")
  })

  it("updates a live account, leaving untouched fields intact", async () => {
    await setup()
    const id = svc.create(SAMPLE)

    svc.update(id, { name: "Renamed" })

    const row = fyredb.repo(accountEntity).get(id)
    expect(row?.name).toBe("Renamed")
    expect(row?.currency).toBe("INR") // carried over from the original
  })

  it("update is a no-op for an unknown id", async () => {
    await setup()
    expect(() => { svc.update("missing", { name: "x" }) }).not.toThrow()
  })

  it("archives and restores an account", async () => {
    await setup()
    const id = svc.create(SAMPLE)

    svc.archive(id)
    expect(fyredb.repo(accountEntity).get(id)?.archived).toBe(true)

    svc.restore(id)
    expect(fyredb.repo(accountEntity).get(id)?.archived).toBe(false)
  })

  it("currencyOf returns the live account's currency, else undefined", async () => {
    await setup()
    const id = fyredb.repo(accountEntity).save({ ...SAMPLE, currency: "USD" })

    expect(svc.currencyOf(id)).toBe("USD")
    expect(svc.currencyOf("missing")).toBeUndefined()
  })

  it("mergeMetadata is a no-op for an unknown id", async () => {
    await setup()
    expect(() => { svc.mergeMetadata("missing", { ifscCode: ["X"] }) }).not.toThrow()
  })

  it("omits the mask and the synthetic tag for a too-short account number", async () => {
    await setup()
    fyredb.repo(accountEntity).save({ ...SAMPLE, metadata: { accountNumber: ["123"] } })

    expect(svc.accounts$.value[0].maskedNumber).toBeUndefined()
    expect(svc.accountTags$.value).toHaveLength(0)
  })

  it("tolerates an account row carrying no metadata at all", async () => {
    await setup()
    fyredb.repo(accountEntity).save({ ...SAMPLE, metadata: {} })

    const view = svc.accounts$.value[0]
    expect(view.maskedNumber).toBeUndefined()
    expect(svc.accountTags$.value).toHaveLength(0)
    expect(svc.getAccountDetails(view.id)?.metadata).toEqual({})
  })

  it("returns undefined from the on-demand readers for an unknown id", async () => {
    await setup()
    expect(svc.revealAccountNumber("missing")).toBeUndefined()
    expect(svc.getAccountDetails("missing")).toBeUndefined()
  })

  it("defaults metadata to an empty bag for a legacy row that lacks it entirely", async () => {
    await setup()
    const id = fyredb.repo(accountEntity).save({ ...SAMPLE, metadata: undefined } as unknown as Account)
    expect(svc.getAccountDetails(id)?.metadata).toEqual({})
  })
})
