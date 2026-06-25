import { useCallback, useSyncExternalStore } from "react"
import type { ReadonlySubject } from "@/services/types"

/**
 * Bind a service-exposed reactive value to React. Subscribes to the source via
 * `useSyncExternalStore` — the store is the source of truth, the component holds
 * no mirror copy and re-renders on emit. `source.value` is the synchronous
 * snapshot.
 */
export function useObservable<T>(source: ReadonlySubject<T>): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const sub = source.subscribe(() => { onStoreChange() })
      return () => { sub.unsubscribe() }
    },
    [source],
  )
  const getSnapshot = useCallback(() => source.value, [source])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
