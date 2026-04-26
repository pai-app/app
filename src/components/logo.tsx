import LogoSvg from "@/assets/logo.svg?react"
import { cn } from "@/lib/utils"

type LogoProps = {
  readonly className?: string
  readonly title?: string
}

export function Logo({ className, title = "fin" }: LogoProps) {
  return (
    <LogoSvg
      role="img"
      aria-label={title}
      className={cn("h-5 w-auto", className)}
    />
  )
}
