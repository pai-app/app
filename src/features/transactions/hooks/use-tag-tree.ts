import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { Subject, debounceTime, distinctUntilChanged } from "rxjs"
import { useObservable } from "@/providers/use-observable"
import { useServices } from "@/providers/services-provider"
import type { TagView } from "@/views/tag-view"
import { REMOVE_TAG, type TagWithChildren } from "@/components/tag-picker/types"

function tokenize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .replaceAll(/[^\w]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 0)
}

function buildTree(tags: readonly TagView[]): readonly TagWithChildren[] {
  const childrenByParent = new Map<string, TagView[]>()
  for (const t of tags) {
    if (t.parent) {
      const list = childrenByParent.get(t.parent) ?? []
      list.push(t)
      childrenByParent.set(t.parent, list)
    }
  }
  return tags
    .filter((t) => !t.parent)
    .map((t) => ({
      ...t,
      children: childrenByParent.get(t.id) ?? [],
      searchWords: tokenize([t.name, t.description ?? ""].join(" ")),
    }))
}

function filterTree(
  query: string,
  tags: readonly TagWithChildren[],
): readonly TagWithChildren[] {
  const words = tokenize(query)
  if (words.length === 0) return tags

  const matches = (sw: readonly string[]) =>
    sw.some((token) => words.every((w) => token.startsWith(w)))

  return tags.flatMap<TagWithChildren>((parent) => {
    if (matches(parent.searchWords)) return [parent]
    const matchingChildren = parent.children.filter((c) =>
      matches(tokenize([c.name, c.description ?? ""].join(" "))),
    )
    if (matchingChildren.length > 0) {
      return [{ ...parent, children: matchingChildren }]
    }
    return []
  })
}

export type UseTagTreeOptions = {
  /** When set, a "Remove tag" row is prepended to the result. */
  readonly selectedTagId?: string | null
  /** Reset the query when this flips to `true` (e.g. picker opens). */
  readonly resetSignal: boolean
}

export type UseTagTreeResult = {
  readonly rows: readonly TagWithChildren[]
  readonly query: string
  readonly onQueryChange: (e: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Builds a hierarchical, debounced-filtered tag list for the picker. Hides:
 *
 * - Tree construction from the flat tag list
 * - rxjs-debounced query subject (300ms)
 * - Optional "Remove tag" row injection
 */
export function useTagTree({ selectedTagId, resetSignal }: UseTagTreeOptions): UseTagTreeResult {
  const tags = useObservable(useServices().tags.displayTags$)
  const tree = useMemo(() => buildTree(tags), [tags])

  const [query, setQuery] = useState("")
  const [filtered, setFiltered] = useState<readonly TagWithChildren[]>(tree)
  const search$ = useMemo(() => new Subject<string>(), [])

  // Reset whenever the parent flips `resetSignal` (typically: picker opens).
  useEffect(() => {
    if (!resetSignal) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery("")
    setFiltered(tree)
  }, [resetSignal, tree])

  // Debounced filter pipeline.
  useEffect(() => {
    const sub = search$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((q) => {
        setFiltered(filterTree(q, tree))
      })
    return () => { sub.unsubscribe(); }
  }, [search$, tree])

  const onQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    search$.next(e.target.value)
  }

  const showRemoveRow = selectedTagId !== undefined && selectedTagId !== null
  const rows = useMemo<readonly TagWithChildren[]>(() => {
    if (!showRemoveRow) return filtered
    return [{ ...REMOVE_TAG, children: [], searchWords: [] }, ...filtered]
  }, [filtered, showRemoveRow])

  return { rows, query, onQueryChange }
}
