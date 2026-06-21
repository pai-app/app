import { describe, it, expect, afterEach } from "vitest"
import { firstValueFrom } from "rxjs"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../helpers/test-fyredb"
import { TransactionsService } from "@/services/transactions-service"
import { transactionEntity, tagRuleEntity, type Transaction } from "@/services/entities"
import { importSourceEntity } from "@/services/entities/import-source"

const JAN = "2026-01"
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

function tx(over: Partial<Transaction> & { hash: string }): Transaction {
  return {
    accountId: "acc-1",
    narration: "ZOMATO ORDER",
    transactionAt: Date.UTC(2026, 0, 15),
    amount: -50000,
    ...over,
  }
}

/** A UPI narration that resolves to the established rule key `upi:rajesh@ybl`. */
const UPI = "UPI-RAJESH@YBL"
const UPI_KEY = "upi:rajesh@ybl"

describe("TransactionsService", () => {
  let fyredb: FyreDb
  let svc: TransactionsService

  afterEach(async () => {
    svc.dispose()
    await fyredb.dispose().catch(() => {})
  })

  async function setup(): Promise<void> {
    fyredb = await createTestFyreDb()
    svc = new TransactionsService(fyredb)
  }

  /** Establish a confident UPI rule by tagging two like transactions (recurrence
   *  gate + evidence ⇒ `established`), returning the repo for further saves. */
  function establishUpiRule(): void {
    const repo = fyredb.repo(transactionEntity)
    // Save both BEFORE tagging so the key already recurs: the first tag
    // materialises the rule (votes 1), the second strengthens it (votes 2 ⇒
    // evidence ≥ MIN_EVIDENCE, majority 1.0 ⇒ established).
    const id1 = repo.save(tx({ hash: "u1", narration: UPI }))
    const id2 = repo.save(tx({ hash: "u2", narration: UPI, transactionAt: Date.UTC(2026, 0, 16) }))
    svc.tag(id1, "tag-food")
    svc.tag(id2, "tag-food")
  }

  it("tags an untagged transaction as a human tag", async () => {
    await setup()
    const repo = fyredb.repo(transactionEntity)
    const id = repo.save(tx({ hash: "h1" }))

    svc.tag(id, "tag-food")

    expect(repo.get(id)?.tagId).toBe("tag-food")
    expect(repo.get(id)?.autoTagged ?? false).toBe(false) // human tag, not auto
  })

  it("exposes learned rules on tagRules$", async () => {
    await setup()
    const repo = fyredb.repo(transactionEntity)
    // A rule is learned once a narration recurs (recurrence gate), so tag two.
    svc.tag(repo.save(tx({ hash: "h1" })), "tag-food")
    svc.tag(repo.save(tx({ hash: "h2", transactionAt: Date.UTC(2026, 0, 16) })), "tag-food")

    await flush() // the global tagRule partition projects on the next tick
    expect(svc.tagRules$.value).toHaveLength(1)
  })

  it("accumulates votes across like transactions (rule is reused, not reset)", async () => {
    // Guards the `ruleByKey` regression: a bare-key `get` missed the namespaced
    // rule id, re-materialising the rule and resetting its counts to 1.
    await setup()
    const repo = fyredb.repo(transactionEntity)
    const id1 = repo.save(tx({ hash: "h1" }))
    const id2 = repo.save(tx({ hash: "h2", transactionAt: Date.UTC(2026, 0, 16) }))

    svc.tag(id1, "tag-food")
    svc.tag(id2, "tag-food")

    const rules = fyredb.repo(tagRuleEntity).query()
    expect(rules).toHaveLength(1) // same narration → same rule key
    expect(rules[0].votes["tag-food"]).toBe(2) // accumulated, not reset to 1
  })

  it("untags a transaction", async () => {
    await setup()
    const repo = fyredb.repo(transactionEntity)
    const id = repo.save(tx({ hash: "h1" }))
    svc.tag(id, "tag-food")

    svc.untag(id)

    expect(repo.get(id)?.tagId).toBeUndefined()
  })

  it("sets a transaction title", async () => {
    await setup()
    const repo = fyredb.repo(transactionEntity)
    const id = repo.save(tx({ hash: "h1" }))

    svc.setTitle(id, "Team lunch")

    expect(repo.get(id)?.title).toBe("Team lunch")
  })

  it("observeMonths streams the rows for the requested partitions", async () => {
    await setup()
    const repo = fyredb.repo(transactionEntity)
    repo.save(tx({ hash: "h1" }))
    repo.save(tx({ hash: "h2", transactionAt: Date.UTC(2026, 0, 20) }))

    const rows = await firstValueFrom(svc.observeMonths([JAN]))

    expect(rows).toHaveLength(2)
  })

  it("tagMany applies the same tag to every row", async () => {
    await setup()
    const repo = fyredb.repo(transactionEntity)
    const id1 = repo.save(tx({ hash: "h1" }))
    const id2 = repo.save(tx({ hash: "h2", narration: "SWIGGY", transactionAt: Date.UTC(2026, 0, 17) }))

    svc.tagMany([id1, id2], "tag-food")

    expect(repo.get(id1)?.tagId).toBe("tag-food")
    expect(repo.get(id2)?.tagId).toBe("tag-food")
  })

  it("acceptSuggestion tags an untagged row (a plain human touch, D2)", async () => {
    await setup()
    const repo = fyredb.repo(transactionEntity)
    const id = repo.save(tx({ hash: "h1" }))

    svc.acceptSuggestion(id, "tag-food")

    expect(repo.get(id)?.tagId).toBe("tag-food")
    expect(repo.get(id)?.autoTagged ?? false).toBe(false)
  })

  it("importNewTransactions auto-tags a row matching an established rule", async () => {
    await setup()
    establishUpiRule()
    const repo = fyredb.repo(transactionEntity)

    svc.importNewTransactions([
      tx({ hash: "imp1", narration: UPI, transactionAt: Date.UTC(2026, 0, 18) }),
    ])

    const row = repo.get(`transaction.${JAN}.imp1`)
    expect(row?.tagId).toBe("tag-food")
    expect(row?.autoTagged).toBe(true) // applied by the engine, not a human
  })

  it("importNewTransactions never clobbers an existing human tag", async () => {
    await setup()
    establishUpiRule()
    const repo = fyredb.repo(transactionEntity)

    svc.importNewTransactions([
      tx({ hash: "imp2", narration: UPI, transactionAt: Date.UTC(2026, 0, 19), tagId: "tag-manual" }),
    ])

    const row = repo.get(`transaction.${JAN}.imp2`)
    expect(row?.tagId).toBe("tag-manual")
    expect(row?.autoTagged ?? false).toBe(false)
  })

  it("applyRulesToTransactions auto-tags only the untagged matches and returns the count", async () => {
    await setup()
    establishUpiRule()
    const repo = fyredb.repo(transactionEntity)
    repo.save(tx({ hash: "s1", narration: UPI, transactionAt: Date.UTC(2026, 0, 20) }))
    repo.save(tx({ hash: "s2", narration: UPI, transactionAt: Date.UTC(2026, 0, 21) }))

    const applied = svc.applyRulesToTransactions(repo.query({ keys: [JAN] }))

    expect(applied).toBe(2) // the two untagged look-alikes; the rule's own rows are already tagged
    expect(repo.get(`transaction.${JAN}.s1`)?.autoTagged).toBe(true)
    expect(repo.get(`transaction.${JAN}.s2`)?.autoTagged).toBe(true)
  })

  it("untags an auto-tagged row (corrects via the autoApplied histogram)", async () => {
    await setup()
    establishUpiRule()
    const repo = fyredb.repo(transactionEntity)
    svc.importNewTransactions([
      tx({ hash: "auto1", narration: UPI, transactionAt: Date.UTC(2026, 0, 22) }),
    ])
    const id = `transaction.${JAN}.auto1`
    expect(repo.get(id)?.autoTagged).toBe(true)

    svc.untag(id)

    expect(repo.get(id)?.tagId).toBeUndefined()
    expect(repo.get(id)?.autoTagged ?? false).toBe(false)
  })

  it("untag is a no-op for a missing or already-untagged row", async () => {
    await setup()
    const repo = fyredb.repo(transactionEntity)
    const id = repo.save(tx({ hash: "h1" }))

    expect(svc.untag("missing")).toEqual({})
    expect(svc.untag(id)).toEqual({}) // untagged already
  })

  it("resolves the import-source descriptor for a transaction's sourceId", async () => {
    await setup()
    const sourceId = fyredb.repo(importSourceEntity).save({
      importLogId: "log-1",
      importedAt: Date.UTC(2026, 0, 15),
      adapterId: "hdfc/savings",
      descriptor: { kind: "file", fileName: "statement.pdf", fileType: "application/pdf" },
      counts: { parsed: 3, new: 3, duplicate: 0 },
    })

    expect(svc.sourceDescriptor(sourceId)).toEqual({
      kind: "file",
      fileName: "statement.pdf",
      fileType: "application/pdf",
    })
    expect(svc.sourceDescriptor(undefined)).toBeUndefined()
    expect(svc.sourceDescriptor("missing")).toBeUndefined()
  })

  it("threads the source adapter into a rule's provenance via sourceId", async () => {
    await setup()
    const sourceId = fyredb.repo(importSourceEntity).save({
      importLogId: "log-1",
      importedAt: Date.UTC(2026, 0, 15),
      adapterId: "hdfc/savings",
      descriptor: { kind: "file", fileName: "statement.pdf" },
      counts: { parsed: 1, new: 1, duplicate: 0 },
    })
    const repo = fyredb.repo(transactionEntity)
    const id1 = repo.save(tx({ hash: "p1", narration: UPI, sourceId }))
    const id2 = repo.save(tx({ hash: "p2", narration: UPI, transactionAt: Date.UTC(2026, 0, 16), sourceId }))

    svc.tag(id1, "tag-food")
    svc.tag(id2, "tag-food")

    expect(svc.ruleByKey(UPI_KEY)?.sourceAdapterIds).toContain("hdfc/savings")
  })

  it("exposes the TaggingData port reads (rules / ruleByKey / transactionsByKey)", async () => {
    await setup()
    establishUpiRule()

    expect(svc.rules()).toHaveLength(1)
    const rule = svc.ruleByKey(UPI_KEY)
    expect(rule?.key).toBe(UPI_KEY)
    expect(rule?.votes["tag-food"]).toBe(2)
    expect(svc.ruleByKey("upi:nobody@ybl")).toBeUndefined()
    expect(svc.transactionsByKey(UPI_KEY)).toHaveLength(2)
  })

  it("deletes a rule by its entity id", async () => {
    await setup()
    establishUpiRule()
    const ruleRow = fyredb.repo(tagRuleEntity).query()[0]

    svc.deleteRule(ruleRow.id)

    expect(fyredb.repo(tagRuleEntity).query()).toHaveLength(0)
  })

  it("drops a rule when untagging removes its last contribution (delete delta)", async () => {
    await setup()
    const repo = fyredb.repo(transactionEntity)
    // Two like rows make the key recur; tagging one materialises a single-vote
    // rule, and untagging it debits the vote to zero → engine emits a delete.
    const id1 = repo.save(tx({ hash: "d1", narration: UPI }))
    repo.save(tx({ hash: "d2", narration: UPI, transactionAt: Date.UTC(2026, 0, 16) }))
    svc.tag(id1, "tag-food")
    expect(fyredb.repo(tagRuleEntity).query()).toHaveLength(1)

    svc.untag(id1)

    expect(fyredb.repo(tagRuleEntity).query()).toHaveLength(0)
  })

  it("setTitle is a no-op for a missing row", async () => {
    await setup()
    expect(() => { svc.setTitle("missing", "x") }).not.toThrow()
  })
})
