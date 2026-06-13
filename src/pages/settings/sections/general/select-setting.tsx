import { Button } from "@/ui/button"
import { Icon } from "@/ui/icon"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
import { SettingRow } from "./setting-row"
import type { SettingOption } from "./options"

/** A settings row whose control is a single-choice dropdown. */
export function SelectSetting({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string
  description?: string
  value: string
  options: readonly SettingOption[]
  onChange: (value: string) => void
}) {
  const selected = options.find((o) => o.value === value)

  return (
    <SettingRow label={label} description={description}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-56 justify-between">
            <span className="truncate">{selected?.label ?? value}</span>
            <Icon name="chevron-down" className="size-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
          {options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={o.value === value}
              onSelect={() => { onChange(o.value) }}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SettingRow>
  )
}
