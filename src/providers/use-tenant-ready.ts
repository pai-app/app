import { useTenant } from "@fyre-db/plugins-ui"

/**
 * True once a tenant is open in the FyreDb core. Repository reads/subscriptions
 * must wait for this — calling `repo.observe()`/`observeQuery()` before a tenant
 * is active fires `ensurePartition` with no tenant context, which resolves to
 * the wrong (un-scoped) storage key and silently yields no data with no retry.
 *
 * `active` is sourced from the core's `activeTenant$`, so when it is defined the
 * tenant context is guaranteed set.
 */
export function useTenantReady(): boolean {
  return useTenant().active !== undefined
}
