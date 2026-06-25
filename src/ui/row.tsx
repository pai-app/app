import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const rowVariants = cva("flex items-center gap-4", {
  variants: {
    variant: {
      card: "justify-between rounded-lg border p-4",
      plain: "",
    },
  },
  defaultVariants: {
    variant: "card",
  },
})

type RowProps<E extends React.ElementType = "div"> = {
  as?: E
  leading?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
  children?: React.ReactNode
} & VariantProps<typeof rowVariants> &
  Omit<React.ComponentPropsWithoutRef<E>, "as" | "title" | "className" | "children">

/**
 * A polymorphic, slotted layout row: optional leading adornment, a text block
 * (title + description) plus free-form children, and an optional trailing slot.
 * The `card` variant reproduces the bordered settings-row look.
 */
function Row<E extends React.ElementType = "div">({
  as,
  variant,
  leading,
  title,
  description,
  trailing,
  className,
  children,
  ...props
}: RowProps<E>) {
  const Comp = as ?? "div"

  return (
    <Comp data-slot="row" className={cn(rowVariants({ variant }), className)} {...props}>
      {leading}
      <div className="min-w-0 flex-1">
        {title != null && <div className="text-sm">{title}</div>}
        {description != null && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
        {children}
      </div>
      {trailing}
    </Comp>
  )
}

export { Row, rowVariants }
