import { ThemeSwitcher } from "@/components/theme-switcher"
import { useObservable } from "@/lib/use-observable"
import { useServices } from "@/providers/services-provider"
import { SettingRow } from "./general/setting-row"
import { SelectSetting } from "./general/select-setting"
import { currencyOptions, dayOptions, monthOptions } from "./general/options"

export function GeneralSection() {
  const { settings: settingsService } = useServices()
  const settings = useObservable(settingsService.settings$)

  return (
    <div className="flex flex-col gap-6">
      <SettingRow label="Theme">
        <ThemeSwitcher />
      </SettingRow>

      <SelectSetting
        label="Currency"
        description="Default currency for new accounts and totals."
        value={settings.currency}
        options={currencyOptions()}
        onChange={(currency) => { settingsService.update({ currency }) }}
      />

      <SelectSetting
        label="First month of year"
        description="Start of your fiscal year for the year selector."
        value={String(settings.firstMonth)}
        options={monthOptions(settings.locale)}
        onChange={(value) => { settingsService.update({ firstMonth: Number(value) }) }}
      />

      <SelectSetting
        label="First day of week"
        value={String(settings.firstDay)}
        options={dayOptions(settings.locale)}
        onChange={(value) => { settingsService.update({ firstDay: Number(value) }) }}
      />
    </div>
  )
}
