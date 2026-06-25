import { describe, it, expect, afterEach } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../../helpers/test-fyredb"
import { importLogEntity } from "@/entities/import-log"
import { sweepProgress, type ImportLogEmailRun } from "@/entities/import-log"
import { importSourceEntity, importSourceMonthKey } from "@/entities/import-source"

function run(over: Partial<ImportLogEmailRun> = {}): ImportLogEmailRun {
  return {
    newestAt: 1000,
    cursorAt: 600,
    scanned: 0,
    imported: 0,
    ...over,
  }
}

describe("sweepProgress", () => {
  it("reports a finished run (not live) as a complete, exact bar", () => {
    expect(sweepProgress(run(), false)).toEqual({ value: 1, estimated: false })
  })

  it("computes an exact fraction when a usable floor (targetAt < newestAt) exists", () => {
    // newestAt 1000, cursorAt 600, targetAt 200 → (1000-600)/(1000-200) = 0.5
    expect(sweepProgress(run({ targetAt: 200 }), true)).toEqual({ value: 0.5, estimated: false })
  })

  it("clamps the exact fraction into [0, 1]", () => {
    // cursorAt older than targetAt → raw fraction > 1, clamped to 1
    expect(sweepProgress(run({ cursorAt: 100, targetAt: 200 }), true)).toEqual({
      value: 1,
      estimated: false,
    })
    // cursorAt newer than newestAt → raw fraction < 0, clamped to 0
    expect(sweepProgress(run({ cursorAt: 1200, targetAt: 200 }), true)).toEqual({
      value: 0,
      estimated: false,
    })
  })

  it("estimates from scan count when there is no floor (first backfill)", () => {
    const { value, estimated } = sweepProgress(run({ scanned: 200 }), true)
    expect(estimated).toBe(true)
    expect(value).toBeCloseTo(1 - Math.exp(-1), 5) // scanned/200 = 1
  })

  it("estimates when targetAt is not older than newestAt (unreachable floor)", () => {
    const { estimated } = sweepProgress(run({ targetAt: 1000, scanned: 10 }), true)
    expect(estimated).toBe(true)
  })

  it("estimated fill is zero at the very start and grows monotonically", () => {
    const start = sweepProgress(run({ scanned: 0 }), true)
    const later = sweepProgress(run({ scanned: 50 }), true)
    expect(start.value).toBe(0)
    expect(later.value).toBeGreaterThan(start.value)
  })
})

describe("importSourceMonthKey", () => {
  it("derives a UTC YYYY-MM key from an epoch", () => {
    expect(importSourceMonthKey(Date.UTC(2025, 0, 15))).toBe("2025-01")
    expect(importSourceMonthKey(Date.UTC(2025, 11, 31))).toBe("2025-12")
  })
})

describe("partitioned entity month-key strategies", () => {
  let fyredb: FyreDb

  afterEach(async () => {
    await fyredb.dispose().catch(() => {})
  })

  it("shards an import-log into the YYYY-MM partition of its triggeredAt", async () => {
    fyredb = await createTestFyreDb()
    const repo = fyredb.repo(importLogEntity)

    const id = repo.save({
      trigger: "manual",
      triggeredAt: Date.UTC(2025, 2, 9),
      status: "completed",
      source: { kind: "file", fileName: "march.pdf" },
      touchedAccountIds: [],
      counts: { parsed: 0, new: 0, duplicate: 0 },
    })

    expect(id).toContain("2025-03") // composite id encodes the partition
    expect(repo.get(id)?.source.kind).toBe("file")
  })

  it("shards an import-source into the YYYY-MM partition of its importedAt", async () => {
    fyredb = await createTestFyreDb()
    const repo = fyredb.repo(importSourceEntity)

    const id = repo.save({
      importLogId: "log-1",
      importedAt: Date.UTC(2025, 5, 1),
      descriptor: { kind: "file", fileName: "june.pdf" },
      counts: { parsed: 1, new: 1, duplicate: 0 },
    })

    expect(id).toContain("2025-06")
  })
})
