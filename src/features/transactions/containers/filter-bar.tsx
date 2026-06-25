import type { Ref } from "react"
import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { SortControl } from "../components/sort-control"
import { AccountFilter } from "./account-filter"
import { TagToggle } from "../components/tag-toggle"
import { AmountRange } from "./amount-range"
import { SearchBar } from "@/components/search-bar"
import type { UseTransactionsFilter } from "../hooks/use-transactions-filter"

export type FilterBarProps = {
  readonly state: UseTransactionsFilter
  readonly ref?: Ref<HTMLDivElement>
}

/**
 * Desktop filter bar — sticky, inline controls composing the shared `filters/`
 * components. Live-apply; a Clear-all button appears once any filter is set.
 */
export function FilterBar({ state, ref }: FilterBarProps) {
  const { clearAll, dirty } = state
  return (
    <div
      ref={ref}
      className="sticky top-[72px] z-20 -mt-2 flex flex-row flex-wrap items-center gap-1.5 pb-2"
    >
      <SortControl state={state} />
      <AccountFilter state={state} />
      <TagToggle state={state} />
      <AmountRange state={state} />
      {dirty && (
        <Button variant="ghost" size="sm" className="font-light" onClick={clearAll}>
          <Icon name="x" />
          Clear all
        </Button>
      )}
      <div className="flex-1" />
      <SearchBar state={state} />
    </div>
  )
}
