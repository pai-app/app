import type { Ref } from "react"
import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { SortControl } from "./filters/sort-control"
import { AccountFilter } from "./filters/account-filter"
import { TagToggle } from "./filters/tag-toggle"
import { AmountRange } from "./filters/amount-range"
import { SearchBar } from "./filters/search-bar"
import type { UseTransactionsFilter } from "../use-transactions-filter"

export type FilterBarProps = {
  readonly state: UseTransactionsFilter
  readonly ref?: Ref<HTMLDivElement>
}

/**
 * Desktop filter bar — sticky, inline controls composing the shared `filters/`
 * components. Live-apply; a Clear-all button appears once any filter is set.
 */
export function FilterBar({ state, ref }: FilterBarProps) {
  const { filter, patch, clearAll, dirty } = state
  return (
    <div
      ref={ref}
      className="sticky top-[72px] z-20 -mt-2 flex flex-row flex-wrap items-center gap-1.5 pb-2"
    >
      <SortControl sort={filter.sort} onChange={(sort) => { patch({ sort }) }} />
      <AccountFilter
        selected={filter.accountIds}
        onChange={(accountIds) => { patch({ accountIds }) }}
      />
      <TagToggle value={filter.tag} onChange={(tag) => { patch({ tag }) }} />
      <AmountRange
        min={filter.amountMin}
        max={filter.amountMax}
        onChange={({ min, max }) => { patch({ amountMin: min, amountMax: max }) }}
      />
      {dirty && (
        <Button variant="ghost" size="sm" className="font-light" onClick={clearAll}>
          <Icon name="x" />
          Clear all
        </Button>
      )}
      <div className="flex-1" />
      <SearchBar
        value={filter.search}
        onChange={(search) => { patch({ search }) }}
        className="w-56"
      />
    </div>
  )
}
