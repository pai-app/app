import { ThemeSwitcher } from "@/components/theme-switcher"

export function GeneralSection() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <span className="text-sm">Theme</span>
        <ThemeSwitcher />
      </div>
    </div>
  )
}
