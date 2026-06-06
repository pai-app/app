import { Icon } from "@/ui/icon"

/**
 * Home dashboard — placeholder until the overview widgets land. The navbar
 * and import flows live in the surrounding layout, so this page only needs an
 * empty state for now.
 */
export function HomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Icon name="home" className="size-10 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Coming soon</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your finance overview will appear here.
        </p>
      </div>
    </div>
  )
}