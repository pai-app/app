import { LandingHeader } from "./landing-header"
import { LandingHero } from "./landing-hero"
import { FeatureGrid } from "./feature-grid"
import { LandingCta } from "./landing-cta"
import { LandingFooter } from "./landing-footer"

/**
 * Public marketing landing page. Standalone (no app providers/templates) so it
 * renders for signed-out visitors. Primary CTA routes to `/login`.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        <LandingHero />
        <FeatureGrid />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
