import { describe, it, expect, afterEach, vi } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../helpers/test-fyredb"
import { ConnectionsService } from "@/services/connections-service"
import { authAccountEntity, type AuthAccount } from "@/services/entities"
import {
  emailImportSettingEntity,
  type EmailImportSetting,
} from "@/services/entities/email-import-setting"
import { FEATURE_CREDS_KEY } from "@shared/providers"

// `ConnectionsService` imports `clientAuth` from the app bootstrap module; mock
// it so `connectGoogle` / `connectMicrosoft` route to spy `login`s without
// pulling in the real OAuth client (and its heavy plugin graph).
const { googleLogin, microsoftLogin } = vi.hoisted(() => ({
  googleLogin: vi.fn(),
  microsoftLogin: vi.fn(),
}))
vi.mock("@/lib/fyredb-config", () => ({
  clientAuth: {
    supportedAuths: () => [
      { name: "google", login: googleLogin },
      { name: "microsoft", login: microsoftLogin },
    ],
  },
}))

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

const EMAIL_ACCOUNT: AuthAccount = {
  provider: "google",
  feature: "email",
  userId: "user-1",
  email: "jane@example.com",
  name: "Jane Doe",
  picture: "https://example.com/jane.png",
  refreshToken: "super-secret-token",
}

function setting(authAccountId: string): EmailImportSetting {
  return {
    authAccountId,
    paused: false,
    importState: { lastImportAt: 1700000000000 },
  }
}

/** The constructor consumes one-shot OAuth creds from sessionStorage; the
 *  web-storage setup file makes that read a harmless no-op in node. */

describe("ConnectionsService", () => {
  let fyredb: FyreDb
  let svc: ConnectionsService
  const realFetch = globalThis.fetch

  afterEach(async () => {
    svc.dispose()
    await fyredb.dispose().catch(() => {})
    sessionStorage.clear()
    globalThis.fetch = realFetch
    googleLogin.mockClear()
    microsoftLogin.mockClear()
  })

  async function setup(): Promise<void> {
    fyredb = await createTestFyreDb()
    svc = new ConnectionsService(fyredb)
  }

  it("joins an email account with its import setting into a token-free view", async () => {
    await setup()
    const id = fyredb.repo(authAccountEntity).save(EMAIL_ACCOUNT)
    fyredb.repo(emailImportSettingEntity).save(setting(id))

    await flush() // the global partitions project on the next tick
    const views = svc.connections$.value
    expect(views).toHaveLength(1)
    expect(views[0].email).toBe("jane@example.com")
    expect(views[0].provider).toBe("google")
    expect(views[0].lastSyncedAt).toBe(1700000000000)
    // The refresh token must never reach the UI view.
    expect(JSON.stringify(views[0])).not.toContain("super-secret-token")
  })

  it("excludes auth accounts whose feature is not email", async () => {
    await setup()
    fyredb.repo(authAccountEntity).save({ ...EMAIL_ACCOUNT, feature: "drive" })

    await flush()
    expect(svc.connections$.value).toHaveLength(0)
  })

  it("reveals the full row including the token via the on-demand reader", async () => {
    await setup()
    const id = fyredb.repo(authAccountEntity).save(EMAIL_ACCOUNT)

    expect(svc.getAuthAccount(id)?.refreshToken).toBe("super-secret-token")
  })

  it("deletes the auth account and its import setting on disconnect", async () => {
    await setup()
    const id = fyredb.repo(authAccountEntity).save(EMAIL_ACCOUNT)
    const settingId = fyredb.repo(emailImportSettingEntity).save(setting(id))

    await flush() // let the setting subscription populate before disconnect
    svc.disconnect(id)

    expect(fyredb.repo(authAccountEntity).get(id)).toBeUndefined()
    expect(fyredb.repo(emailImportSettingEntity).get(settingId)).toBeUndefined()
  })

  it("connectGoogle logs in via the google auth adapter", async () => {
    await setup()
    svc.connectGoogle()
    expect(googleLogin).toHaveBeenCalledExactlyOnceWith("email")
    expect(microsoftLogin).not.toHaveBeenCalled()
  })

  it("connectMicrosoft logs in via the microsoft auth adapter", async () => {
    await setup()
    svc.connectMicrosoft()
    expect(microsoftLogin).toHaveBeenCalledExactlyOnceWith("email")
    expect(googleLogin).not.toHaveBeenCalled()
  })

  /** Stub `fetch` to return a userinfo payload, and seed one-shot creds. */
  function seedCreds(provider: string, info: Record<string, string>): void {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(info), { status: 200 })),
    )
    globalThis.fetch = fetchMock
    sessionStorage.setItem(
      FEATURE_CREDS_KEY,
      JSON.stringify({ provider, feature: "email", accessToken: "at", refreshToken: "rt" }),
    )
  }

  it("materialises a saved AuthAccount from google feature creds on construction", async () => {
    fyredb = await createTestFyreDb()
    seedCreds("google", { sub: "g-1", email: "g@example.com", name: "G User", picture: "p.png" })

    svc = new ConnectionsService(fyredb)
    await flush()

    const rows = fyredb.repo(authAccountEntity).query()
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe("g@example.com")
    expect(rows[0].refreshToken).toBe("rt")
    expect(sessionStorage.getItem(FEATURE_CREDS_KEY)).toBeNull() // consumed
  })

  it("materialises a microsoft AuthAccount from the graph userinfo shape", async () => {
    fyredb = await createTestFyreDb()
    seedCreds("microsoft", { id: "m-1", userPrincipalName: "m@example.com", displayName: "M User" })

    svc = new ConnectionsService(fyredb)
    await flush()

    const rows = fyredb.repo(authAccountEntity).query()
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe("m@example.com")
    expect(rows[0].name).toBe("M User")
  })

  it("is a no-op when no feature creds are present", async () => {
    fyredb = await createTestFyreDb()
    svc = new ConnectionsService(fyredb)
    await flush()

    expect(fyredb.repo(authAccountEntity).query()).toHaveLength(0)
  })

  it("does not save when userinfo lacks an identity (no userId)", async () => {
    fyredb = await createTestFyreDb()
    seedCreds("google", { email: "no-id@example.com" }) // no sub/id

    svc = new ConnectionsService(fyredb)
    await flush()

    expect(fyredb.repo(authAccountEntity).query()).toHaveLength(0)
  })

  it("is a no-op when the feature creds are not valid JSON", async () => {
    fyredb = await createTestFyreDb()
    sessionStorage.setItem(FEATURE_CREDS_KEY, "{not json")

    svc = new ConnectionsService(fyredb)
    await flush()

    expect(fyredb.repo(authAccountEntity).query()).toHaveLength(0)
    expect(sessionStorage.getItem(FEATURE_CREDS_KEY)).toBeNull() // still consumed
  })

  it("does not save when the userinfo request fails", async () => {
    fyredb = await createTestFyreDb()
    const fetchMock = vi.fn(() => Promise.resolve(new Response("nope", { status: 401 })))
    globalThis.fetch = fetchMock
    sessionStorage.setItem(
      FEATURE_CREDS_KEY,
      JSON.stringify({ provider: "google", feature: "email", accessToken: "at", refreshToken: "rt" }),
    )

    svc = new ConnectionsService(fyredb)
    await flush()

    expect(fyredb.repo(authAccountEntity).query()).toHaveLength(0)
  })
})
