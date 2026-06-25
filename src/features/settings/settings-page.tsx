import type { ReactNode } from "react"
import { Navigate, useLocation, useNavigate, useParams } from "react-router"
import { SectionPage, type Section } from "@/components/section-page"
import { GeneralSection } from "@/features/settings/sections/general-section"
import { AccountsSection } from "@/features/settings/sections/accounts-section"
import { ImportsSection } from "@/features/settings/sections/imports-section"
import { RulesSection } from "@/features/settings/sections/rules-section"

type SettingsSection = {
  readonly key: string
  readonly label: string
  readonly icon: string
  readonly element: ReactNode
}

const SECTIONS: SettingsSection[] = [
  { key: "general", label: "General", icon: "settings", element: <GeneralSection /> },
  { key: "accounts", label: "Accounts", icon: "mail", element: <AccountsSection /> },
  { key: "imports", label: "Imports", icon: "upload", element: <ImportsSection /> },
  { key: "rules", label: "Tag Rules", icon: "sparkles", element: <RulesSection /> },
]

export function SettingsPage() {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const base = `/t/${tenantId ?? ""}/settings`

  const activeKey = pathname.slice(base.length).split("/").filter(Boolean)[0] ?? ""

  if (!SECTIONS.some((s) => s.key === activeKey)) {
    return <Navigate to={`${base}/${SECTIONS[0].key}`} replace />
  }

  const sections: Section[] = SECTIONS.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
    onClick: () => { void navigate(`${base}/${s.key}`) },
    element: s.element,
  }))

  return <SectionPage title="Settings" sections={sections} active={activeKey} />
}
