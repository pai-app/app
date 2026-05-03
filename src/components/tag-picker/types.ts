import type { TagRow } from "@/providers/entity-provider"

/** Synthetic id for the "Remove tag" row, surfaced when a tag is currently set. */
export const REMOVE_TAG_ID = "__remove-tag"

export const REMOVE_TAG: TagRow = {
  id: REMOVE_TAG_ID,
  name: "Remove tag",
  icon: "bookmark-x",
  description: "Clear the tag from this transaction",
}

export type TagWithChildren = TagRow & {
  readonly children: readonly TagRow[]
  /** Lower-cased word tokens of name + description, for prefix search. */
  readonly searchWords: readonly string[]
}
