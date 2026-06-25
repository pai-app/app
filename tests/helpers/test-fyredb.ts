import { FyreDb, MemoryStorageAdapter } from "@fyre-db/core"
import { ENTITIES } from "@/entities"

/**
 * A real, in-memory `FyreDb` with an open tenant — gives service unit tests
 * faithful repo behaviour (real `deriveId`, partitioning, `query`,
 * `observeQuery`) without any browser storage. Dispose it in `afterEach`.
 *
 *   const fyredb = await createTestFyreDb()
 *   const svc = new AccountsService(fyredb)
 *   …
 *   await fyredb.dispose()
 */
export async function createTestFyreDb(): Promise<FyreDb> {
  const fyredb = new FyreDb({
    appId: "test",
    deviceId: "dev-test",
    entities: ENTITIES,
    localAdapter: new MemoryStorageAdapter(),
    cloudAdapter: new MemoryStorageAdapter(),
  })
  const tenant = await fyredb.tenants.create({ name: "Test", meta: {} })
  await fyredb.tenants.open(tenant.id)
  return fyredb
}
