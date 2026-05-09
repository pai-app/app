/**
 * Money is stored as integer minor units (e.g. paise for INR, cents for USD).
 *
 * Why integer rather than `BigInt`, string, or float:
 * - Floats lose precision (`0.1 + 0.2 !== 0.3`). Disqualified.
 * - Strings need parsing for every arithmetic op. Annoying.
 * - `BigInt` is overkill — JS `number` represents integers up to 2^53 - 1
 *   exactly, which is ≈ 90 trillion in major units. Sufficient.
 *
 * Sign represents direction: positive = inflow, negative = outflow. The
 * account's `kind` decides how to display the running balance (e.g. credit
 * cards show "owed" instead of "available").
 */
export type Money = number
