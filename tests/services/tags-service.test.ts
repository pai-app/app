import { describe, it, expect, afterEach, vi } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../helpers/test-fyredb"
import { AccountsService } from "@/services/accounts-service"
import { TagsService } from "@/services/tags-service"
import { accountEntity, tagEntity } from "@/entities"
import { type Account, type Tag } from "@/entities"
import { SYSTEM_TAGS } from "@/catalog/system-tags"

const ACCOUNT: Account = {
  kind: "bank",
  name: "Test Bank",
  currency: "INR",
  metadata: { accountNumber: ["1234567890"] },
}

const USER_TAG: Tag = { name: "Groceries", icon: "shopping-cart" }

describe("TagsService", () => {
  let fyredb: FyreDb
  let accounts: AccountsService
  let svc: TagsService

  afterEach(async () => {
    svc.dispose()
    accounts.dispose()
    await fyredb.dispose().catch(() => {})
  })

  async function setup(): Promise<void> {
    fyredb = await createTestFyreDb()
    accounts = new AccountsService(fyredb)
    svc = new TagsService(fyredb, accounts)
  }

  it("includes system tags plus saved user tags on displayTags$", async () => {
    await setup()
    const id = fyredb.repo(tagEntity).save(USER_TAG)

    // The global tag partition projects on a later tick; poll until it settles.
    await vi.waitFor(() => {
      const tags = svc.displayTags$.value
      expect(tags).toHaveLength(SYSTEM_TAGS.length + 1)
      expect(tags.some((t) => t.id === id && t.name === "Groceries")).toBe(true)
    })
  })

  it("orders system tags, then user tags, then account tags", async () => {
    await setup()
    const userId = fyredb.repo(tagEntity).save(USER_TAG)
    fyredb.repo(accountEntity).save(ACCOUNT)

    await vi.waitFor(() => {
      const tags = svc.displayTags$.value
      const last = tags[tags.length - 1]
      expect(last.accountId).toBeDefined() // synthetic account tag sorts last

      const userIdx = tags.findIndex((t) => t.id === userId)
      const accountIdx = tags.findIndex((t) => t.accountId !== undefined)
      const lastSystemIdx = tags.findIndex((t) => t.id === SYSTEM_TAGS[SYSTEM_TAGS.length - 1].id)
      expect(lastSystemIdx).toBeLessThan(userIdx) // system before user
      expect(userIdx).toBeLessThan(accountIdx) // user before account
    })
  })

  it("nests a child tag under its parent in tagTree$", async () => {
    await setup()
    const parentId = SYSTEM_TAGS[0].id
    const childId = fyredb.repo(tagEntity).save({ ...USER_TAG, parent: parentId })

    await vi.waitFor(() => {
      const root = svc.tagTree$.value.find((n) => n.id === parentId)
      expect(root).toBeDefined()
      expect(root?.children.some((c) => c.id === childId)).toBe(true)
    })
  })

  it("renames a tag", async () => {
    await setup()
    const id = fyredb.repo(tagEntity).save(USER_TAG)

    svc.rename(id, "Food")

    expect(fyredb.repo(tagEntity).get(id)?.name).toBe("Food")
  })

  it("sets a tag icon", async () => {
    await setup()
    const id = fyredb.repo(tagEntity).save(USER_TAG)

    svc.setIcon(id, "carrot")

    expect(fyredb.repo(tagEntity).get(id)?.icon).toBe("carrot")
  })

  it("deletes a tag", async () => {
    await setup()
    const id = fyredb.repo(tagEntity).save(USER_TAG)

    svc.delete(id)

    expect(fyredb.repo(tagEntity).get(id)).toBeUndefined()
  })

  it("create returns the new tag id", async () => {
    await setup()
    const id = svc.create(USER_TAG)
    expect(fyredb.repo(tagEntity).get(id)?.name).toBe("Groceries")
  })

  it("rename and setIcon are no-ops for an unknown id", async () => {
    await setup()
    expect(() => { svc.rename("missing", "X") }).not.toThrow()
    expect(() => { svc.setIcon("missing", "X") }).not.toThrow()
  })

  it("orders multiple user tags alphabetically by name", async () => {
    await setup()
    fyredb.repo(tagEntity).save({ name: "Zebra", icon: "z" })
    fyredb.repo(tagEntity).save({ name: "Apple", icon: "a" })

    await vi.waitFor(() => {
      const tags = svc.displayTags$.value
      const apple = tags.findIndex((t) => t.name === "Apple")
      const zebra = tags.findIndex((t) => t.name === "Zebra")
      expect(apple).toBeGreaterThan(-1)
      expect(apple).toBeLessThan(zebra) // sorted ascending
    })
  })
})
