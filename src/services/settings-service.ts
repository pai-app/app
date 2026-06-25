import { BehaviorSubject, Subscription } from "rxjs"
import type { FyreDb, SingletonRepositoryType as SingletonRepository } from "@fyre-db/core"
import { userSettingsEntity } from "@/entities"
import {
  USER_SETTINGS_DEFAULTS,
  type UserSettings,
} from "@/entities"
import { fiscalYearMonthKeys } from "@/lib/fiscal"
import type { Disposable, ReadonlySubject } from "@/services/types"

/** Settings as the UI sees them — the password vault is intentionally absent. */
export type SettingsView = {
  readonly locale: string
  readonly currency: string
  readonly firstMonth: number
  readonly firstDay: number
}

function toView(s: UserSettings): SettingsView {
  return { locale: s.locale, currency: s.currency, firstMonth: s.firstMonth, firstDay: s.firstDay }
}

/** Fiscal year that today falls into, given a starting month (1..12). */
function currentFiscalYear(firstMonth: number): number {
  const today = new Date()
  const month = today.getMonth() + 1
  return month >= firstMonth ? today.getFullYear() : today.getFullYear() - 1
}

/**
 * Owns `userSettings` (singleton) and the transient selected fiscal year.
 * Exposes a UI-safe settings view (no vault), the selected year + derived
 * `monthKeys` (single source for the transactions read), and an on-demand
 * password-vault read for the import flow.
 */
export class SettingsService implements Disposable {
  private readonly repo: SingletonRepository<UserSettings>
  private readonly subs = new Subscription()
  private current: UserSettings = USER_SETTINGS_DEFAULTS

  private readonly settings = new BehaviorSubject<SettingsView>(toView(USER_SETTINGS_DEFAULTS))
  private readonly selectedYear: BehaviorSubject<number>
  private readonly monthKeys: BehaviorSubject<readonly string[]>

  constructor(fyredb: FyreDb) {
    this.repo = fyredb.repo(userSettingsEntity)
    const year = currentFiscalYear(USER_SETTINGS_DEFAULTS.firstMonth)
    this.selectedYear = new BehaviorSubject<number>(year)
    this.monthKeys = new BehaviorSubject<readonly string[]>(
      fiscalYearMonthKeys(year, USER_SETTINGS_DEFAULTS.firstMonth),
    )
    this.subs.add(
      this.repo.observe().subscribe((row) => {
        this.current = { ...USER_SETTINGS_DEFAULTS, ...row }
        this.settings.next(toView(this.current))
        this.recomputeMonthKeys()
      }),
    )
  }

  // ── Exposes ──────────────────────────────────────────────
  get settings$(): ReadonlySubject<SettingsView> { return this.settings }
  get selectedYear$(): ReadonlySubject<number> { return this.selectedYear }
  get monthKeys$(): ReadonlySubject<readonly string[]> { return this.monthKeys }

  /** On-demand: the encrypted-attachment password vault (import flow only). */
  getFilePasswords(): readonly string[] {
    return this.current.filePasswords
  }

  // ── Ops ──────────────────────────────────────────────────
  update(patch: Partial<UserSettings>): void {
    this.repo.save({ ...this.current, ...patch })
  }

  setSelectedYear(year: number): void {
    if (year === this.selectedYear.value) return
    this.selectedYear.next(year)
    this.recomputeMonthKeys()
  }

  dispose(): void {
    this.subs.unsubscribe()
  }

  private recomputeMonthKeys(): void {
    this.monthKeys.next(fiscalYearMonthKeys(this.selectedYear.value, this.current.firstMonth))
  }
}
