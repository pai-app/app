/**
 * Fiscal-year helpers. The global year pill selects a fiscal year by its
 * start year; a fiscal year spans `firstMonth` of `year` through
 * `firstMonth - 1` of `year + 1` (12 calendar months).
 */

/**
 * `YYYY-MM` partition keys for the 12 calendar months of a fiscal year.
 *
 * Partitioned entities (transactions, import logs) shard one blob per
 * calendar month. Use these keys to scope a partitioned `query`/`observeQuery`
 * to exactly the months that belong to the selected fiscal year — this also
 * drives lazy partition hydration so the data is loaded into memory.
 *
 * @param year       Fiscal year start year (e.g. 2025 for FY 2025–26).
 * @param firstMonth Fiscal year start month, 1..12.
 */
export function fiscalYearMonthKeys(year: number, firstMonth: number): readonly string[] {
  const keys: string[] = []
  for (let i = 0; i < 12; i++) {
    const offset = firstMonth - 1 + i
    const calYear = year + Math.floor(offset / 12)
    const month = (offset % 12) + 1
    keys.push(`${calYear}-${String(month).padStart(2, "0")}`)
  }
  return keys
}
