import type { ComponentProps } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/sheet"
import { SurfaceHeading } from "./surface-heading"
import type { SurfaceCommonProps } from "./types"

export type SheetSurfaceProps = SurfaceCommonProps & {
  readonly contentProps?: Omit<ComponentProps<typeof SheetContent>, "children">
}

export function SheetSurface({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  srOnlyTitle,
  children,
  contentProps,
}: SheetSurfaceProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent {...contentProps}>
        <SurfaceHeading
          parts={{
            Title: SheetTitle,
            Description: SheetDescription,
            Header: SheetHeader,
          }}
          title={title}
          description={description}
          srOnly={srOnlyTitle}
        />
        {children}
      </SheetContent>
    </Sheet>
  )
}
