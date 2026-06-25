import { SectionPage, type Section } from "@/components/section-page"
import { GeneralSection } from "@/features/settings/sections/general-section"
import { AccountsSection } from "@/features/settings/sections/accounts-section"
import { ImportsSection } from "@/features/settings/sections/imports-section"
import { RulesSection } from "@/features/settings/sections/rules-section"

const sections: Section[] = [
  { key: "general", label: "General", icon: "settings", path: "general", element: <GeneralSection /> },
  { key: "accounts", label: "Accounts", icon: "mail", path: "accounts", element: <AccountsSection /> },
  { key: "imports", label: "Imports", icon: "upload", path: "imports", element: <ImportsSection /> },
  { key: "rules", label: "Tag Rules", icon: "sparkles", path: "rules", element: <RulesSection /> },
]

export function SettingsPage() {
  return <SectionPage title="Settings" sections={sections} />
}
