import { useState } from "react"
import { Logo } from "@/components/logo"
import { SyncStatus } from "@/components/sync-status"
import { cn } from "@/lib/utils"

type BrandPillProps = {
  readonly className?: string
  readonly isMobile?: boolean
}

export function BrandPill({ className, isMobile = false }: BrandPillProps) {
  const [showLogo, setShowLogo] = useState(true)

  return (
    <div className={cn("glass flex h-11 items-center gap-2 rounded-full px-3", className)}>
      {(!isMobile || showLogo) && (
        <span
          className={cn(isMobile && "animate-fade-out [animation-delay:1.5s] [animation-fill-mode:forwards]")}
          onAnimationEnd={isMobile ? () => setShowLogo(false) : undefined}
        >
          <Logo linked />
        </span>
      )}
      <SyncStatus />
    </div>
  )
}
