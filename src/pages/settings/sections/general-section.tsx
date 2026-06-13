import { ThemeSwitcher } from "@/components/theme-switcher"
import { useEntity } from "@/providers/entity-provider"
import { SettingRow } from "./general/setting-row"
import { SelectSetting } from "./general/select-setting"
import { currencyOptions, dayOptions, monthOptions } from "./general/options"

export function GeneralSection() {
  const { settings, setSettings } = useEntity()

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
        onChange={(currency) => { setSettings({ currency }) }}
      />

      <SelectSetting
        label="First month of year"
        description="Start of your fiscal year for the year selector."
        value={String(settings.firstMonth)}
        options={monthOptions(settings.locale)}
        onChange={(value) => { setSettings({ firstMonth: Number(value) }) }}
      />

      <SelectSetting
        label="First day of week"
        value={String(settings.firstDay)}
        options={dayOptions(settings.locale)}
        onChange={(value) => { setSettings({ firstDay: Number(value) }) }}
      />
    </div>
  )
}
