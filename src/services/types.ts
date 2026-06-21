import type { Observable } from "rxjs"

/**
 * A read-only reactive value: an observable that also exposes its current
 * snapshot. Services expose their live state as this (backed by an rxjs
 * `BehaviorSubject`); `useObservable` binds it to React via
 * `useSyncExternalStore`.
 */
export type ReadonlySubject<T> = Observable<T> & { readonly value: T }

/** A per-tenant service with deterministic teardown on tenant switch. */
export interface Disposable {
  /** Unsubscribe from the store and cancel in-flight work. */
  dispose(): void
}
