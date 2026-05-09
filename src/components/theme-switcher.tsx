import { Icon } from "@/ui/icon"
import { ToggleGroup, ToggleGroupItem } from "@/ui/toggle-group"
import { useTheme, type Theme } from "@/providers/theme-provider"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={theme}
      onValueChange={(value) => {
        if (value) setTheme(value as Theme)
      }}
      size="sm"
    >
      <ToggleGroupItem value="light" aria-label="Light theme">
        <Icon name="sun" className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark theme">
        <Icon name="moon" className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="system" aria-label="System theme">
        <Icon name="monitor" className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
