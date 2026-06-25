import type { AccountKind } from "@/entities"

/**
 * The structural subset of a money account the account icon needs. Both the raw
 * `Account` row and the UI-safe `AccountView` satisfy this, so every call
 * site — raw-row or view-model — works without conversion.
 */
export type AccountIconData = {
  readonly icon?: string
  readonly bankId?: string
  readonly kind: AccountKind
}
