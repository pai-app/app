import { useEffect, useState, type DependencyList } from "react"
import type { Observable } from "rxjs"

/**
 * Bridge a PARAMETERIZED service observable (re-created when deps change) to
 * React. Subscribes on mount/dep-change, tracks the latest emission and a
 * loading flag (true until the first emit). For unparameterized BehaviorSubject
 * reads use `useObservable` instead.
 */
export function useObservableQuery<T>(
  factory: () => Observable<T>,
  deps: DependencyList,
  initial: T,
): { readonly value: T; readonly loading: boolean } {
  const [state, setState] = useState<{ value: T; loading: boolean }>({
    value: initial,
    loading: true,
  })

  useEffect(() => {
    const sub = factory().subscribe((value) => {
      setState({ value, loading: false })
    })
    return () => { sub.unsubscribe() }
    // `factory` closes over `deps`; subscribing on the passed-through deps is
    // the intended contract for this parameterized bridge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
