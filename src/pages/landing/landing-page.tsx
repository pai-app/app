import { LandingHeader } from "./components/landing-header"
import { LandingHero } from "./components/landing-hero"
import { FeatureGrid } from "./components/feature-grid"
import { LandingCta } from "./components/landing-cta"
import { LandingFooter } from "./components/landing-footer"

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
