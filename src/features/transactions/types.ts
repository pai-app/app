import type { ReactNode } from "react"
import type { FilterControlProps } from "@/views/filter-control-props"

export type { FilterVariant, FilterControlProps } from "@/views/filter-control-props"

/** A filter control — a self-contained read/write over one slice of the filter. */
export type FilterControl = (props: FilterControlProps) => ReactNode
