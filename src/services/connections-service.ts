/**
 * ConnectionsService — the per-tenant domain service for connected email
 * accounts. One instance per `FyreDb` (the provider owns the rebuild on tenant
 * switch).
 *
 * It subscribes to the `AuthAccount` and `EmailImportSetting` repos once in the
 * constructor and joins each pair into a UI-safe `ConnectionView` — the same
 * read-time projection the old `accounts-section` did, minus all React. Tokens
 * (`refreshToken`) never leave the raw row.
 */

import { BehaviorSubject, Subscription } from "rxjs"
import type { BaseEntity, FyreDb, RepositoryType as Repository } from "@fyre-db/core"
import { authAccountEntity, type AuthAccount } from "@/services/entities"
import {
  emailImportSettingEntity,
  type EmailImportSetting,
} from "@/services/entities/email-import-setting"
import { clientAuth } from "@/lib/fyredb-config"
import { GOOGLE_AUTH_NAME, MICROSOFT_AUTH_NAME } from "@shared/providers"
import type { Disposable, ReadonlySubject } from "@/services/types"

/** A connected email account as the UI sees it — NO tokens. */
export type ConnectionView = {
  readonly id: string
  readonly provider: string
  readonly email: string
  readonly name: string
  readonly picture: string
  readonly lastSyncedAt?: number // from the joined emailImportSetting.importState.lastImportAt
  readonly hasError: boolean // !!emailImportSetting.lastErrorLogId
}

type AuthRow = AuthAccount & BaseEntity
type SettingRow = EmailImportSetting & BaseEntity

function toConnectionView(account: AuthRow, setting: SettingRow | undefined): ConnectionView {
  return {
    id: account.id,
    provider: account.provider,
    email: account.email,
    name: account.name,
    picture: account.picture,
    lastSyncedAt: setting?.importState.lastImportAt,
    hasError: setting?.lastErrorLogId !== undefined,
  }
}

export class ConnectionsService implements Disposable {
  private readonly authRepo: Repository<AuthAccount>
  private readonly settingsRepo: Repository<EmailImportSetting>
  private readonly subs = new Subscription()

  private accounts: readonly AuthRow[] = []
  private settings: readonly SettingRow[] = []

  private readonly connections = new BehaviorSubject<readonly ConnectionView[]>([])

  constructor(fyredb: FyreDb) {
    this.authRepo = fyredb.repo(authAccountEntity)
    this.settingsRepo = fyredb.repo(emailImportSettingEntity)
    this.subs.add(
      this.authRepo.observeQuery().subscribe((rows) => {
        this.accounts = rows
        this.recompute()
      }),
    )
    this.subs.add(
      this.settingsRepo.observeQuery().subscribe((rows) => {
        this.settings = rows
        this.recompute()
      }),
    )
  }

  // ── Exposes ──────────────────────────────────────────────
  get connections$(): ReadonlySubject<readonly ConnectionView[]> { return this.connections }

  // ── Ops ──────────────────────────────────────────────────
  connectGoogle(): void {
    void clientAuth.supportedAuths().find((a) => a.name === GOOGLE_AUTH_NAME)?.login("email")
  }

  connectMicrosoft(): void {
    void clientAuth.supportedAuths().find((a) => a.name === MICROSOFT_AUTH_NAME)?.login("email")
  }

  disconnect(id: string): void {
    this.authRepo.delete(id)
    const setting = this.settings.find((s) => s.authAccountId === id)
    if (setting !== undefined) {
      this.settingsRepo.delete(setting.id)
    }
  }

  dispose(): void {
    this.subs.unsubscribe()
  }

  private recompute(): void {
    const settingsByAccountId = new Map(this.settings.map((s) => [s.authAccountId, s]))
    this.connections.next(
      this.accounts
        .filter((a) => a.feature === "email")
        .map((a) => toConnectionView(a, settingsByAccountId.get(a.id))),
    )
  }
}
