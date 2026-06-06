import type { ReactNode } from "react"

type HeadingComponent = (props: {
  readonly className?: string
  readonly children?: ReactNode
}) => ReactNode

export type SurfaceHeadingParts = {
  readonly Title: HeadingComponent
  readonly Description: HeadingComponent
  /** Optional wrapper rendered around the visible title + description. */
  readonly Header?: HeadingComponent
}

export type SurfaceHeadingProps = {
  readonly parts: SurfaceHeadingParts
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly srOnly?: boolean
}

/**
 * Renders a surface's title (and optional description) using the
 * primitive-specific components passed via `parts`. When `srOnly` is set the
 * heading is visually hidden but still announced — this is what keeps
 * dialog/sheet/drawer compliant with Radix's required-title rule even when a
 * surface has no visible header.
 */
export function SurfaceHeading({
  parts,
  title,
  description,
  srOnly,
}: SurfaceHeadingProps) {
  const { Title, Description, Header } = parts

  if (srOnly) {
    return (
      <>
        <Title className="sr-only">{title}</Title>
        {description ? (
          <Description className="sr-only">{description}</Description>
        ) : null}
      </>
    )
  }

  const heading = (
    <>
      <Title>{title}</Title>
      {description ? <Description>{description}</Description> : null}
    </>
  )

  return Header ? <Header>{heading}</Header> : heading
}
