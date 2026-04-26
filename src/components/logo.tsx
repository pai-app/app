import { Link, useInRouterContext, useParams } from "react-router"
import LogoSvg from "@/assets/logo.svg?react"
import { cn } from "@/lib/utils"

type LogoProps = {
  readonly className?: string
  readonly title?: string
  readonly linked?: boolean
}

export function Logo({ className, title = "fin", linked = false }: LogoProps) {
  const inRouter = useInRouterContext()
  const params = useParams<{ tenantId?: string }>()

  const svg = (
    <LogoSvg
      role="img"
      aria-label={title}
      className={cn("m-1 h-4 w-8 font-bold", className)}
    />
  )

  if (linked && inRouter) {
    return (
      <Link to={params.tenantId ? `/t/${params.tenantId}` : "/"} aria-label={title} className="cursor-pointer">
        {svg}
      </Link>
    )
  }

  return svg
}
