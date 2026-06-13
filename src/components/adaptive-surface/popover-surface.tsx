import type { ComponentProps } from "react"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/ui/popover"
import { SurfaceHeading } from "./surface-heading"
import type { SurfaceCommonProps } from "./types"

export type PopoverSurfaceProps = SurfaceCommonProps & {
  readonly contentProps?: Omit<ComponentProps<typeof PopoverContent>, "children">
}

export function PopoverSurface({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  srOnlyTitle,
  children,
  contentProps,
}: PopoverSurfaceProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger ? <PopoverTrigger asChild>{trigger}</PopoverTrigger> : null}
      <PopoverContent {...contentProps}>
        <SurfaceHeading
          parts={{
            Title: PopoverTitle,
            Description: PopoverDescription,
            Header: PopoverHeader,
          }}
          title={title}
          description={description}
          srOnly={srOnlyTitle}
        />
        {children}
      </PopoverContent>
    </Popover>
  )
}
