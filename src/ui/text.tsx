import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const textVariants = cva("", {
  variants: {
    variant: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      label: "text-xs font-medium uppercase tracking-wider text-muted-foreground",
      caption: "text-xs text-muted-foreground",
      heading: "text-lg font-semibold tracking-tight text-foreground",
      title: "text-2xl font-bold tracking-tight text-foreground",
      destructive: "text-destructive",
    },
    size: {
      default: "text-sm",
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
    },
    weight: {
      default: "",
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
    weight: "default",
  },
})

type TextElement = "p" | "span" | "h1" | "h2" | "h3" | "h4" | "label"

function Text({
  className,
  variant,
  size,
  weight,
  as: Tag = "span",
  asChild = false,
  ...props
}: Omit<React.ComponentProps<"span">, "ref"> &
  VariantProps<typeof textVariants> & {
    as?: TextElement
    asChild?: boolean
    ref?: React.Ref<HTMLElement>
  }) {
  const Comp = (asChild ? Slot.Root : Tag) as React.ElementType

  return (
    <Comp
      data-slot="text"
      className={cn(textVariants({ variant, size, weight, className }))}
      {...props}
    />
  )
}

export { Text, textVariants }
