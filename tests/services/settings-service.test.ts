import { describe, it, expect, afterEach, vi } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../helpers/test-fyredb"
import { SettingsService } from "@/services/settings-service"
import { USER_SETTINGS_DEFAULTS } from "@/entities"
import { fiscalYearMonthKeys } from "@/lib/fiscal"

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

    // The singleton observe projects on a later tick; poll until it settles.
    await vi.waitFor(() => {
      expect(svc.settings$.value.currency).toBe("USD")
    })
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

    // The vault is read off the async-projected `current`; poll until it lands.
    await vi.waitFor(() => {
      expect(svc.getFilePasswords()).toEqual(["s3cret"])
    })
    // The vault must never surface on the UI-facing view.
    expect(Object.keys(svc.settings$.value)).not.toContain("filePasswords")
    expect(JSON.stringify(svc.settings$.value)).not.toContain("s3cret")
  })
})
