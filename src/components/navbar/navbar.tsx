import { cn } from "@/lib/utils"
import { useApp } from "@/providers/app-provider"
import { BrandPill } from "./brand-pill"
import { TenantPill } from "./tenant-pill"
import { MenuPill } from "./menu-pill"
import { ProfilePill } from "./profile-pill"

type NavbarProps = {
  readonly className?: string
  readonly isMobile?: boolean
}

export function Navbar({ className, isMobile: isMobileProp }: NavbarProps) {
  const { isMobile: isMobileCtx } = useApp()
  const isMobile = isMobileProp ?? isMobileCtx
  const variant = isMobile ? "compact" : "default"

  return (
    <div className={cn("flex flex-row items-center gap-2 z-20", className)}>
      <BrandPill isMobile={isMobile} />
      <div className="grow" />
      <TenantPill variant={variant} />
      <MenuPill variant={variant} />
      <ProfilePill />
    </div>
  )
}
