import { Link } from "react-router"
import { Icon } from "@/ui/icon"
import { Button } from "@/ui/button"
import { HeroPreview } from "./hero-preview"

/** Headline, value proposition, primary CTAs and a product preview. */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-168 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
            <Icon name="sparkles" className="size-3.5 text-accent" />
            Offline-first personal finance
          </span>

          <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Your money,{" "}
            <span className="bg-linear-to-r from-accent to-foreground bg-clip-text text-transparent">
              quietly organised
            </span>
            .
          </h1>

          <p className="max-w-md text-base text-pretty text-muted-foreground sm:text-lg">
            Pai pulls bank statements from your inbox, tags every transaction
            automatically, and keeps it all private — encrypted in your own cloud,
            working even when you&apos;re offline.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/login">
                Get started
                <Icon name="arrow-right" className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <Icon name="shield-check" className="size-3.5 text-accent" />
            Your data never touches our servers.
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  )
}
