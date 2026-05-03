import { useMemo, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
import { useSettings } from "@/providers/entity-provider"
import { cn } from "@/lib/utils"

const MONTH_SHORT = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/** "26" → "'26". */
function shortYear(year: number): string {
  return `'${String(year).slice(-2)}`
}

/** Month label rendered smaller and slightly muted. */
function MonthLabel({ children }: { readonly children: ReactNode }) {
  return <span className="text-[0.7em] font-medium text-muted-foreground">{children}</span>
}

/** Build the visible label for a fiscal year given the starting month. */
function formatYear(year: number, firstMonth: number, compact: boolean): ReactNode {
  if (firstMonth === 1) return shortYear(year)
  if (compact) {
    return (
      <>
        <MonthLabel>FY</MonthLabel>
        <span>{shortYear(year)}</span>
      </>
    )
  }
  return (
    <>
      <MonthLabel>{MONTH_SHORT[firstMonth]}</MonthLabel>
      <span>{shortYear(year)}</span>
      <span className="text-muted-foreground">–</span>
      <MonthLabel>{MONTH_SHORT[firstMonth - 1]}</MonthLabel>
      <span>{shortYear(year + 1)}</span>
    </>
  )
}

const RANGE = 3

type YearPillProps = {
  readonly className?: string
  readonly variant?: "default" | "compact"
}

export function YearPill({ className, variant = "default" }: YearPillProps) {
  const { year, setYear, settings } = useSettings()
  const { firstMonth } = settings
  const compact = variant === "compact"

  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentFy = currentMonth >= firstMonth ? today.getFullYear() : today.getFullYear() - 1

  // Static window of `currentFy ± RANGE`. Dropdown does not drift as the user
  // navigates years.
  const years = useMemo(() => {
    const out: number[] = []
    for (let y = currentFy - RANGE; y <= currentFy + RANGE; y++) out.push(y)
    return out
  }, [currentFy])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Select year"
          className={cn(
            "glass flex h-11 cursor-pointer items-center gap-1 rounded-full text-sm font-medium",
            compact ? "px-2.5" : "px-3",
            className,
          )}
        >
          <span className="flex items-baseline gap-1">{formatYear(year, firstMonth, compact)}</span>
          <ChevronDown className="ml-0.5 size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="min-w-32">
        <DropdownMenuRadioGroup
          value={String(year)}
          onValueChange={(v) => { setYear(Number(v)); }}
        >
          {years.map((y) => (
            <DropdownMenuRadioItem key={y} value={String(y)}>
              <span className="flex items-baseline gap-1">{formatYear(y, firstMonth, false)}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
