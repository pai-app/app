import { Icon } from "@/ui/icon"

type PreviewRow = {
  readonly label: string
  readonly tag: string
  readonly dot: string
  readonly amount: string
  readonly positive?: boolean
}

const ROWS: readonly PreviewRow[] = [
  { label: "Blue Tokai Coffee", tag: "Dining", dot: "bg-amber-500", amount: "−₹420" },
  { label: "Salary — Acme Inc", tag: "Income", dot: "bg-emerald-500", amount: "+₹1,80,000", positive: true },
  { label: "Airtel Broadband", tag: "Bills · Internet", dot: "bg-sky-500", amount: "−₹999" },
  { label: "Swiggy", tag: "Eating In", dot: "bg-orange-500", amount: "−₹640" },
  { label: "HDFC Mutual Fund", tag: "Investments", dot: "bg-violet-500", amount: "−₹10,000" },
]

/**
 * Decorative, non-interactive mock of an imported statement. Communicates the
 * core loop — email import → auto-tagged transactions → synced — without
 * depending on app providers.
 */
export function HeroPreview() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-4xl bg-accent/10 blur-2xl"
      />
      <div className="glass grainy rounded-3xl p-2 shadow-xl">
        <div className="rounded-2xl bg-card/80 p-4 ring-1 ring-foreground/10">
          {/* Card header */}
          <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Icon name="mail" className="size-4.5" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">September statement</span>
                <span className="text-xs text-muted-foreground">Imported from Gmail</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Icon name="cloud-check" className="size-3.5" />
              Synced
            </span>
          </div>

          {/* Rows */}
          <ul className="flex flex-col">
            {ROWS.map((row) => (
              <li
                key={row.label}
                className="flex items-center gap-3 border-b border-border/40 py-2.5 last:border-0"
              >
                <span className={`size-2 shrink-0 rounded-full ${row.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{row.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{row.tag}</div>
                </div>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    row.positive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                  }`}
                >
                  {row.amount}
                </span>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
            <Icon name="sparkles" className="size-3.5 text-accent" />
            Auto-tagged · no manual sorting
          </div>
        </div>
      </div>
    </div>
  )
}
