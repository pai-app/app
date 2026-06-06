import type { ComponentProps } from "react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/ui/drawer"
import { SurfaceHeading } from "./surface-heading"
import type { SurfaceCommonProps } from "./types"

export type DrawerSurfaceProps = SurfaceCommonProps & {
  /** Edge the drawer slides from. Lives on the vaul root, not the content. */
  readonly direction?: ComponentProps<typeof Drawer>["direction"]
  readonly contentProps?: Omit<ComponentProps<typeof DrawerContent>, "children">
}

export function DrawerSurface({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  srOnlyTitle,
  children,
  direction,
  contentProps,
}: DrawerSurfaceProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={direction}>
      {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
      <DrawerContent {...contentProps}>
        <SurfaceHeading
          parts={{
            Title: DrawerTitle,
            Description: DrawerDescription,
            Header: DrawerHeader,
          }}
          title={title}
          description={description}
          srOnly={srOnlyTitle}
        />
        {children}
      </DrawerContent>
    </Drawer>
  )
}
