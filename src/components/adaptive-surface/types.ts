import type { ComponentProps, ReactNode } from "react"
import type { DialogContent } from "@/ui/dialog"
import type { SheetContent } from "@/ui/sheet"
import type { PopoverContent } from "@/ui/popover"
import type { Drawer, DrawerContent } from "@/ui/drawer"

/** Props common to every surface adapter. */
export type SurfaceCommonProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** Trigger element. Wrapped via `asChild`, so it must accept ref + props. */
  readonly trigger?: ReactNode
  /** Accessible title. Required so dialog/sheet/drawer satisfy Radix a11y. */
  readonly title: ReactNode
  readonly description?: ReactNode
  /** Render the title/description visually hidden (still read by AT). */
  readonly srOnlyTitle?: boolean
  /** Body rendered inside the surface. */
  readonly children: ReactNode
}

type DialogProps = Omit<ComponentProps<typeof DialogContent>, "children">
type SheetProps = Omit<ComponentProps<typeof SheetContent>, "children">
type PopoverProps = Omit<ComponentProps<typeof PopoverContent>, "children">
type DrawerProps = Omit<ComponentProps<typeof DrawerContent>, "children">
type DrawerDirection = ComponentProps<typeof Drawer>["direction"]

/**
 * Which overlay primitive to render for a given breakpoint, plus the
 * props forwarded to that primitive's content. Discriminated by `type`.
 */
export type SurfaceSpec =
  | { readonly type: "dialog"; readonly props?: DialogProps }
  | { readonly type: "sheet"; readonly props?: SheetProps }
  | { readonly type: "popover"; readonly props?: PopoverProps }
  | {
      readonly type: "drawer"
      readonly props?: {
        readonly direction?: DrawerDirection
        readonly content?: DrawerProps
      }
    }

export type AdaptiveSurfaceProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly trigger?: ReactNode
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly srOnlyTitle?: boolean
  /** Body rendered inside whichever surface is active. */
  readonly content: ReactNode
  /** Surface to render at/above the desktop breakpoint. */
  readonly desktop: SurfaceSpec
  /** Surface to render below the desktop breakpoint. */
  readonly mobile: SurfaceSpec
}
