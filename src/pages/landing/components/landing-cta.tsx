import { Link } from "react-router"
import { Icon } from "@/ui/icon"
import { Button } from "@/ui/button"

/** Closing call-to-action band before the footer. */
export function LandingCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="glass grainy relative overflow-hidden rounded-3xl px-6 py-14 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/2 size-112 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
        />
        <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Take control of your money today
        </h2>
        <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
          Set up in minutes. Your statements, tagged and synced — completely
          private.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">
              Get started free
              <Icon name="arrow-right" className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
