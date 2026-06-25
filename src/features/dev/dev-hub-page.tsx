import { useParams } from "react-router"
import { SectionPage, type Section } from "@/components/section-page"
import { LoggingSection } from "@/features/dev/sections/logging-section"
import { ComponentsSection } from "@/features/dev/sections/components-section"
import { DataSection } from "@/features/dev/sections/data-section"

/** A dev-tools section, optionally gated behind an open tenant. */
type DevSection = Section & { readonly requiresTenant?: boolean }

const SECTIONS: DevSection[] = [
  { key: "logging", label: "Logging", icon: "terminal", path: "logging", element: <LoggingSection /> },
  { key: "components", label: "Components", icon: "palette", path: "components", element: <ComponentsSection /> },
  { key: "data", label: "Data browser", icon: "database", path: "data/*", element: <DataSection />, requiresTenant: true },
]

/**
 * Developer tools hub. Reachable at `/dev` (non-tenant tools only) and
 * `/t/:tenantId/dev` (adds tenant-scoped tools). The data browser depends on a
 * tenant database (`useDb`), so it only appears when a tenant is open —
 * detected via the `tenantId` route param.
 */
export function DevHubPage() {
  const { tenantId } = useParams()
  const sections = SECTIONS.filter((s) => !s.requiresTenant || Boolean(tenantId))

  return <SectionPage title="Dev" sections={sections} />
}
