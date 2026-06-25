import { useParams } from "react-router"
import { SectionShell, type NavSection } from "@/components/section-shell"
import { useApp } from "@/providers/app-provider"

export function SettingsPage() {
  const { tenantId } = useParams()
  const { isMobile } = useApp()
  const basePath = `/t/${tenantId}/settings`

  const sections: NavSection[] = [
    { key: "general", label: "General", icon: "settings", to: `${basePath}/general` },
    { key: "accounts", label: "Accounts", icon: "mail", to: `${basePath}/accounts` },
    { key: "imports", label: "Imports", icon: "upload", to: `${basePath}/imports` },
    { key: "rules", label: "Tag Rules", icon: "sparkles", to: `${basePath}/rules` },
  ]

  return <SectionShell title="Settings" sections={sections} nav={isMobile ? "list" : "pill"} />
}
