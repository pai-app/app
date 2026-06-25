import { describe, it, expect, afterEach, vi } from "vitest"
import type { FyreDb } from "@fyre-db/core"
import { createTestFyreDb } from "../helpers/test-fyredb"
import { ConnectionsService } from "@/services/connections-service"
import { connectionEntity } from "@/entities"
import type { Connection } from "@/entities"
import {
  emailImportSettingEntity,
} from "@/entities/email-import-setting"
import type { EmailImportSetting } from "@/entities/email-import-setting"
import { FEATURE_CREDS_KEY } from "@shared/providers"

// `ConnectionsService` imports `clientAuth` from the app bootstrap module; mock
// it so `connectGoogle` / `connectMicrosoft` route to spy `login`s without
// pulling in the real OAuth client (and its heavy plugin graph).
const { googleLogin, microsoftLogin } = vi.hoisted(() => ({
  googleLogin: vi.fn(),
  microsoftLogin: vi.fn(),
}))
vi.mock("@/providers/fyredb-config", () => ({
  clientAuth: {
    supportedAuths: () => [
      { name: "google", login: googleLogin },
      { name: "microsoft", login: microsoftLogin },
    ],
  },
}))

const EMAIL_ACCOUNT: Connection = {
  provider: "google",
  feature: "email",
  userId: "user-1",
  email: "jane@example.com",
  name: "Jane Doe",
  picture: "https://example.com/jane.png",
  refreshToken: "super-secret-token",
}

function setting(connectionId: string): EmailImportSetting {
  return {
    connectionId,
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
    const id = fyredb.repo(connectionEntity).save(EMAIL_ACCOUNT)
    fyredb.repo(emailImportSettingEntity).save(setting(id))

    // The global partitions project on a later tick; poll until they settle.
    await vi.waitFor(() => {
      expect(svc.connections$.value).toHaveLength(1)
    })
    const views = svc.connections$.value
    expect(views[0].email).toBe("jane@example.com")
    expect(views[0].provider).toBe("google")
    expect(views[0].lastSyncedAt).toBe(1700000000000)
    // The refresh token must never reach the UI view.
    expect(JSON.stringify(views[0])).not.toContain("super-secret-token")
  })

  it("excludes auth accounts whose feature is not email", async () => {
    await setup()
    fyredb.repo(connectionEntity).save({ ...EMAIL_ACCOUNT, feature: "drive" })

    await vi.waitFor(() => {
      expect(svc.connections$.value).toHaveLength(0)
    })
  })

  it("reveals the full row including the token via the on-demand reader", async () => {
    await setup()
    const id = fyredb.repo(connectionEntity).save(EMAIL_ACCOUNT)

    expect(svc.getConnection(id)?.refreshToken).toBe("super-secret-token")
  })

  it("deletes the auth account and its import setting on disconnect", async () => {
    await setup()
    const id = fyredb.repo(connectionEntity).save(EMAIL_ACCOUNT)
    const settingId = fyredb.repo(emailImportSettingEntity).save(setting(id))

    // Wait for the joined view to populate before disconnecting.
    await vi.waitFor(() => {
      expect(svc.connections$.value).toHaveLength(1)
    })
    svc.disconnect(id)

    expect(fyredb.repo(connectionEntity).get(id)).toBeUndefined()
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

  it("materialises a saved Connection from google feature creds on construction", async () => {
    fyredb = await createTestFyreDb()
    seedCreds("google", { sub: "g-1", email: "g@example.com", name: "G User", picture: "p.png" })

    svc = new ConnectionsService(fyredb)
    // The userinfo fetch + save is async; wait for the materialised row to surface.
    await vi.waitFor(() => {
      expect(svc.connections$.value).toHaveLength(1)
    })

    const rows = fyredb.repo(connectionEntity).query()
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe("g@example.com")
    expect(rows[0].refreshToken).toBe("rt")
    expect(sessionStorage.getItem(FEATURE_CREDS_KEY)).toBeNull() // consumed
  })

  it("materialises a microsoft Connection from the graph userinfo shape", async () => {
    fyredb = await createTestFyreDb()
    seedCreds("microsoft", { id: "m-1", userPrincipalName: "m@example.com", displayName: "M User" })

    svc = new ConnectionsService(fyredb)
    // The userinfo fetch + save is async; wait for the materialised row to surface.
    await vi.waitFor(() => {
      expect(svc.connections$.value).toHaveLength(1)
    })

    const rows = fyredb.repo(connectionEntity).query()
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe("m@example.com")
    expect(rows[0].name).toBe("M User")
  })

  it("falls back to `mail` for the email when userinfo omits `email`", async () => {
    fyredb = await createTestFyreDb()
    seedCreds("microsoft", { id: "m-3", mail: "viamail@example.com", displayName: "Mail User" })

    svc = new ConnectionsService(fyredb)
    await vi.waitFor(() => {
      expect(svc.connections$.value).toHaveLength(1)
    })

    expect(fyredb.repo(connectionEntity).query()[0].email).toBe("viamail@example.com")
  })

  it("stores an empty email when userinfo carries an identity but no address", async () => {
    fyredb = await createTestFyreDb()
    seedCreds("google", { sub: "g-9", name: "No Email User" })

    svc = new ConnectionsService(fyredb)
    await vi.waitFor(() => {
      expect(svc.connections$.value).toHaveLength(1)
    })

    expect(fyredb.repo(connectionEntity).query()[0].email).toBe("")
  })

  it("disconnect removes the auth account even when no import setting exists", async () => {
    await setup()
    const id = fyredb.repo(connectionEntity).save(EMAIL_ACCOUNT)

    svc.disconnect(id) // no email-import-setting was ever saved for this account

    expect(fyredb.repo(connectionEntity).get(id)).toBeUndefined()
  })

  it("is a no-op when no feature creds are present", async () => {
    fyredb = await createTestFyreDb()
    svc = new ConnectionsService(fyredb)

    // No creds → the constructor returns synchronously without saving.
    expect(fyredb.repo(connectionEntity).query()).toHaveLength(0)
  })

  it("does not save when userinfo lacks an identity (no userId)", async () => {
    fyredb = await createTestFyreDb()
    seedCreds("google", { email: "no-id@example.com" }) // no sub/id

    svc = new ConnectionsService(fyredb)

    // Userinfo carries no identity → nothing is ever saved.
    expect(fyredb.repo(connectionEntity).query()).toHaveLength(0)
  })

  it("is a no-op when the feature creds are not valid JSON", async () => {
    fyredb = await createTestFyreDb()
    sessionStorage.setItem(FEATURE_CREDS_KEY, "{not json")

    svc = new ConnectionsService(fyredb)

    // Invalid JSON is consumed and rejected synchronously, before any save.
    expect(fyredb.repo(connectionEntity).query()).toHaveLength(0)
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

    // The userinfo request fails → no identity, so nothing is saved.
    expect(fyredb.repo(connectionEntity).query()).toHaveLength(0)
  })
})
