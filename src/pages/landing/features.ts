/** Real product capabilities surfaced on the landing page. */
export type LandingFeature = {
  readonly icon: string
  readonly title: string
  readonly body: string
}

export const LANDING_FEATURES: readonly LandingFeature[] = [
  {
    icon: "mail",
    title: "Import from your inbox",
    body: "Connect Gmail or Outlook and Pai pulls bank statements straight from your email — no manual downloads.",
  },
  {
    icon: "file-text",
    title: "Statements, parsed",
    body: "Drop a PDF or CSV and Pai reads every transaction for you, ready to review in seconds.",
  },
  {
    icon: "sparkles",
    title: "Auto-tagging",
    body: "Transactions are sorted into a rich, hierarchical tag tree automatically as they come in.",
  },
  {
    icon: "cloud-check",
    title: "Offline-first sync",
    body: "Everything works fully offline and syncs to your own cloud drive the moment you reconnect.",
  },
  {
    icon: "shield-check",
    title: "Private by design",
    body: "Your data is encrypted and lives in your own drive — never on our servers.",
  },
  {
    icon: "users",
    title: "Households",
    body: "Keep personal and family finances in separate, self-contained spaces.",
  },
]
