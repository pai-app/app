import type { ReactNode } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"
import { Sheet, SheetContent, SheetTrigger } from "@/ui/sheet"
import { useApp } from "@/providers/app-provider"

type PopoverContentProps = React.ComponentProps<typeof PopoverContent>
type SheetContentProps = React.ComponentProps<typeof SheetContent>

export type ResponsiveDialogProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** Trigger element. Wrapped in `asChild`, so it must accept ref + props. */
  readonly children: ReactNode
  /** The body rendered inside the popover (desktop) or sheet (mobile). */
  readonly content: ReactNode
  /** Extra props for the desktop `<PopoverContent>`. */
  readonly popoverProps?: Omit<PopoverContentProps, "children">
  /** Extra props for the mobile `<SheetContent>`. */
  readonly sheetProps?: Omit<SheetContentProps, "children" | "side"> & {
    readonly side?: SheetContentProps["side"]
  }
}

/**
 * Surface that adapts to viewport: a popover anchored to the trigger on
 * desktop, a bottom sheet on mobile. Shape is determined by `useApp().isMobile`.
 *
 * Generic — knows nothing about its content. Use it for pickers, filter panels,
 * action menus, info popovers, anything that benefits from the popover/sheet
 * dual surface.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  content,
  popoverProps,
  sheetProps,
}: ResponsiveDialogProps) {
  const { isMobile } = useApp()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" {...sheetProps}>
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent {...popoverProps}>{content}</PopoverContent>
    </Popover>
  )
}
