import { useState } from "react"
import type { UserSettings } from "@/services/entities"

export type UseLoadYearResult = {
  readonly year: number
  readonly setYear: (y: number) => void
}

/** Fiscal year that today's date falls into, given a starting month (1..12). */
function currentFiscalYear(firstMonth: number): number {
  const today = new Date()
  const month = today.getMonth() + 1 // 1..12
  return month >= firstMonth ? today.getFullYear() : today.getFullYear() - 1
}

/**
 * Internal hook — owns the active fiscal year. Transient UI state (resets on
 * refresh). Default is the current fiscal year, computed from
 * `settings.firstMonth` at mount time.
 *
 * Only consumed by `<EntityProvider>`; consumers read via `useEntity()`.
 */
export function useLoadYear(settings: UserSettings): UseLoadYearResult {
  const [year, setYear] = useState<number>(() => currentFiscalYear(settings.firstMonth))
  return { year, setYear }
}
