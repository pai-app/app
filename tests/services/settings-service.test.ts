import { describe, it, expect, afterEach } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../helpers/test-fyredb"
import { SettingsService } from "@/services/settings-service"
import { USER_SETTINGS_DEFAULTS } from "@/services/entities"
import { fiscalYearMonthKeys } from "@/lib/fiscal"

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe("SettingsService", () => {
  let fyredb: FyreDb
  let svc: SettingsService

  afterEach(async () => {
    svc.dispose()
    await fyredb.dispose().catch(() => {})
  })

  async function setup(): Promise<void> {
    fyredb = await createTestFyreDb()
    svc = new SettingsService(fyredb)
  }

  it("exposes the default settings view", async () => {
    await setup()

    const view = svc.settings$.value
    expect(view.locale).toBe(USER_SETTINGS_DEFAULTS.locale)
    expect(view.currency).toBe(USER_SETTINGS_DEFAULTS.currency)
    expect(view.firstMonth).toBe(USER_SETTINGS_DEFAULTS.firstMonth)
    expect(view.firstDay).toBe(USER_SETTINGS_DEFAULTS.firstDay)
  })

  it("persists an update and reflects it on settings$", async () => {
    await setup()

    svc.update({ currency: "USD" })

    await flush() // the singleton observe projects on the next tick
    expect(svc.settings$.value.currency).toBe("USD")
  })

  it("recomputes monthKeys when the selected year changes", async () => {
    await setup()

    svc.setSelectedYear(2030)

    expect(svc.selectedYear$.value).toBe(2030)
    const keys = svc.monthKeys$.value
    expect(keys).toHaveLength(12)
    expect(keys).toEqual(fiscalYearMonthKeys(2030, USER_SETTINGS_DEFAULTS.firstMonth))
    expect(keys[0]).toBe("2030-04") // fiscal year starts in April by default
  })

  it("keeps the password vault off the public view", async () => {
    await setup()

    svc.update({ filePasswords: ["s3cret"] })

    await flush()
    expect(svc.getFilePasswords()).toEqual(["s3cret"])
    // The vault must never surface on the UI-facing view.
    expect(Object.keys(svc.settings$.value)).not.toContain("filePasswords")
    expect(JSON.stringify(svc.settings$.value)).not.toContain("s3cret")
  })
})
