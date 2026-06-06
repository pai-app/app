import { Icon } from "@/ui/icon"
import { Text } from "@/ui/text"
import { LANDING_FEATURES } from "../features"

/** Responsive grid summarising fin's core capabilities. */
export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
        <Text variant="label" className="text-accent">Everything in one place</Text>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          From inbox to insight, automatically
        </h2>
        <p className="text-pretty text-muted-foreground">
          fin handles the busywork of tracking money so you can just look at the
          numbers that matter.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LANDING_FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="group flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-all hover:-translate-y-0.5 hover:ring-accent/30"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
              <Icon name={feature.icon} className="size-5" />
            </span>
            <h3 className="font-heading text-base font-semibold">{feature.title}</h3>
            <p className="text-sm text-pretty text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
