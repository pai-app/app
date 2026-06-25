import { useParams } from "react-router"
import { SectionShell, type NavSection } from "@/components/section-shell"
import { useApp } from "@/providers/app-provider"

/**
 * Developer tools hub. Reachable at `/dev` (non-tenant tools only) and
 * `/t/:tenantId/dev` (adds tenant-scoped tools). The tenant hub is a
 * superset of the non-tenant one.
 */
export function DevHubPage() {
  const { tenantId } = useParams()
  const { isMobile } = useApp()
  const basePath = tenantId ? `/t/${tenantId}/dev` : "/dev"

  const sections: NavSection[] = [
    { key: "logging", label: "Logging", icon: "terminal", to: `${basePath}/logging` },
    { key: "components", label: "Components", icon: "palette", to: `${basePath}/components` },
  ]

  if (tenantId) {
    sections.push(
      { key: "data", label: "Data browser", icon: "database", to: `${basePath}/data` },
    )
  }

  return <SectionShell title="Dev tools" sections={sections} nav={isMobile ? "list" : "pill"} />
}
