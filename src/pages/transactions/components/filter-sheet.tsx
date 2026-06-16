import { useState, type Ref } from "react"
import { AdaptiveSurface } from "@/components/adaptive-surface"
import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { SortControl } from "./filters/sort-control"
import { AccountFilter } from "./filters/account-filter"
import { TagToggle } from "./filters/tag-toggle"
import { AmountRange } from "./filters/amount-range"
import { SearchBar } from "./filters/search-bar"
import type { UseTransactionsFilter } from "../use-transactions-filter"

export type FilterSheetProps = {
  readonly state: UseTransactionsFilter
  readonly resultCount: number
  readonly ref?: Ref<HTMLDivElement>
}

/**
 * Mobile filtering — a collapsible search pill and a filter pill (with an
 * active-count badge) that opens a bottom sheet of stacked controls. Live
 * apply, no Apply button; the list updates behind the partial-height sheet.
 */
export function FilterSheet({ state, resultCount, ref }: FilterSheetProps) {
  const { filter, patch, clearAll, activeCount, dirty } = state
  const [open, setOpen] = useState(false)

  return (
    <div ref={ref} className="sticky top-0 z-20 flex flex-row items-center gap-1.5 px-4 pb-3 pt-2">
      <SearchBar
        value={filter.search}
        onChange={(search) => { patch({ search }) }}
        className="flex-1"
      />
      <AdaptiveSurface
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Filters"
            className="glass relative size-9 shrink-0 rounded-full border border-border"
          >
            <Icon name="sliders-horizontal" />
            {activeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground tabular-nums">
                {activeCount}
              </span>
            )}
          </Button>
        }
        content={
          <div className="flex flex-col gap-4 p-4">
            <Field label="Sort">
              <SortControl
                sort={filter.sort}
                onChange={(sort) => { patch({ sort }) }}
                className="w-full justify-start"
              />
            </Field>
            <Field label="Accounts">
              <AccountFilter
                selected={filter.accountIds}
                onChange={(accountIds) => { patch({ accountIds }) }}
                className="w-full justify-start"
              />
            </Field>
            <Field label="Tag">
              <TagToggle
                value={filter.tag}
                onChange={(tag) => { patch({ tag }) }}
                untaggedCount={state.untaggedCount}
                className="w-full *:flex-1"
              />
            </Field>
            <Field label="Amount">
              <AmountRange
                min={filter.amountMin}
                max={filter.amountMax}
                onChange={({ min, max }) => { patch({ amountMin: min, amountMax: max }) }}
                inline
              />
            </Field>

            <div className="mt-2 flex items-center justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground tabular-nums">
                {resultCount} transaction{resultCount !== 1 ? "s" : ""}
              </span>
              <Button variant="ghost" size="sm" disabled={!dirty} onClick={clearAll}>
                Clear all
              </Button>
            </div>
          </div>
        }
        desktop={{ type: "sheet", props: { side: "bottom" } }}
        mobile={{ type: "sheet", props: { side: "bottom" } }}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
