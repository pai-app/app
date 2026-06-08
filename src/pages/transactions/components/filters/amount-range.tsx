import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import { Input } from "@/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import { cn } from "@/lib/utils"
import { useEntity } from "@/providers/entity-provider"
import { getCurrencyMeta } from "@/lib/format"

export type AmountRangeProps = {
  readonly min?: number
  readonly max?: number
  readonly onChange: (range: { min?: number; max?: number }) => void
  readonly className?: string
  /** Render the two inputs inline (mobile sheet) instead of inside a popover. */
  readonly inline?: boolean
}

function parse(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === "") return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

/** Min/max amount filter (major units, absolute value). Popover on desktop,
 *  inline pair on mobile. */
export function AmountRange({ min, max, onChange, className, inline }: AmountRangeProps) {
  const { settings } = useEntity()
  const symbol = getCurrencyMeta(settings.currency)?.symbol ?? ""
  const active = min !== undefined || max !== undefined

  const fields = (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        {symbol && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {symbol}
          </span>
        )}
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Min"
          value={min ?? ""}
          onChange={(e) => { onChange({ min: parse(e.target.value), max }) }}
          className={cn(symbol && "pl-6")}
        />
      </div>
      <span className="text-muted-foreground">–</span>
      <div className="relative flex-1">
        {symbol && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {symbol}
          </span>
        )}
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Max"
          value={max ?? ""}
          onChange={(e) => { onChange({ min, max: parse(e.target.value) }) }}
          className={cn(symbol && "pl-6")}
        />
      </div>
    </div>
  )

  if (inline) return <div className={className}>{fields}</div>

  const label = active
    ? [min !== undefined ? `${symbol}${min}` : "0", max !== undefined ? `${symbol}${max}` : "∞"].join(" – ")
    : "Amount"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn("glass h-9 rounded-full border border-border font-light", className)}>
          <Icon name="arrow-left-right" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Amount range</span>
          {active && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => { onChange({ min: undefined, max: undefined }) }}
            >
              Clear
            </Button>
          )}
        </div>
        {fields}
      </PopoverContent>
    </Popover>
  )
}
