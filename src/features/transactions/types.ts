import type { ReactNode } from "react"
import type { FilterControlProps } from "@/entities/transaction-filter"

export type { FilterVariant, FilterControlProps } from "@/entities/transaction-filter"

/** A filter control — a self-contained read/write over one slice of the filter. */
export type FilterControl = (props: FilterControlProps) => ReactNode
