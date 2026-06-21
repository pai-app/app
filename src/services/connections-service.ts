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
import { GOOGLE_AUTH_NAME, MICROSOFT_AUTH_NAME, FEATURE_CREDS_KEY } from "@shared/providers"
import { log } from "@/log"
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

/** One-shot OAuth creds left in sessionStorage by the auth callback. */
type FeatureCreds = {
  readonly provider: string
  readonly feature: string
  readonly accessToken: string
  readonly refreshToken: string
}

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
    // Materialise any one-shot OAuth feature creds left in sessionStorage by the
    // auth callback into an AuthAccount row (was EntityProvider's responsibility
    // via the now-removed useConsumeFeatureCreds hook).
    void this.consumeFeatureCreds()
  }

  // ── Exposes ──────────────────────────────────────────────
  get connections$(): ReadonlySubject<readonly ConnectionView[]> { return this.connections }

  /**
   * On-demand: the full auth-account row (including tokens) for an id, used by
   * the mail/email flows that must authenticate. UI display reads
   * `connections$` / `ConnectionView` instead — never this.
   */
  getAuthAccount(id: string): (AuthAccount & BaseEntity) | undefined {
    return this.authRepo.get(id)
  }

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

  /**
   * One-shot: materialise OAuth feature creds left in sessionStorage by the auth
   * callback into an `AuthAccount` row, fetching the provider's userinfo to fill
   * identity fields. Best-effort — failures are swallowed. Runs once on
   * construction (per tenant), replacing the old `useConsumeFeatureCreds` hook.
   */
  private async consumeFeatureCreds(): Promise<void> {
    const raw = sessionStorage.getItem(FEATURE_CREDS_KEY)
    if (raw === null) return
    sessionStorage.removeItem(FEATURE_CREDS_KEY)

    let creds: FeatureCreds
    try {
      creds = JSON.parse(raw) as FeatureCreds
    } catch {
      return
    }

    let userId = ""
    let email = ""
    let name = ""
    let picture = ""
    try {
      const userinfoUrl = creds.provider === MICROSOFT_AUTH_NAME
        ? "https://graph.microsoft.com/v1.0/me"
        : "https://www.googleapis.com/oauth2/v3/userinfo"
      const res = await fetch(userinfoUrl, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      })
      if (res.ok) {
        const info = (await res.json()) as {
          sub?: string; id?: string
          email?: string; mail?: string; userPrincipalName?: string
          name?: string; displayName?: string; picture?: string
        }
        userId = info.sub ?? info.id ?? ""
        email = info.email ?? info.mail ?? info.userPrincipalName ?? ""
        name = info.name ?? info.displayName ?? ""
        picture = info.picture ?? ""
      }
    } catch {
      // best-effort
    }
    if (!userId) return
    log.home("saving auth account for %s (%s)", email, creds.provider)
    this.authRepo.save({
      provider: creds.provider,
      feature: creds.feature,
      userId,
      email,
      name,
      picture,
      refreshToken: creds.refreshToken,
    })
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
