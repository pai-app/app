import type { ComponentProps } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog"
import { SurfaceHeading } from "./surface-heading"
import type { SurfaceCommonProps } from "./types"

export type DialogSurfaceProps = SurfaceCommonProps & {
  readonly contentProps?: Omit<ComponentProps<typeof DialogContent>, "children">
}

export function DialogSurface({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  srOnlyTitle,
  children,
  contentProps,
}: DialogSurfaceProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent {...contentProps}>
        <SurfaceHeading
          parts={{
            Title: DialogTitle,
            Description: DialogDescription,
            Header: DialogHeader,
          }}
          title={title}
          description={description}
          srOnly={srOnlyTitle}
        />
        {children}
      </DialogContent>
    </Dialog>
  )
}
