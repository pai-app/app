import { ThemeSwitcher } from "@/components/theme-switcher"
import { useObservable } from "@/providers/use-observable"
import { useServices } from "@/providers/services-provider"
import { Row } from "@/ui/row"
import { SelectSetting } from "@/components/select-setting"
import { currencyOptions, dayOptions, monthOptions } from "./general/options"

export function GeneralSection() {
  const { settings: settingsService } = useServices()
  const settings = useObservable(settingsService.settings$)

  return (
    <div className="flex flex-col gap-6">
      <Row title="Theme" trailing={<ThemeSwitcher />} />

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
