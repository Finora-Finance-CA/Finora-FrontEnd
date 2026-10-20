// Months as YYYY-MM text, the format GET /api/summary takes. Stepping between months
// is whole-number arithmetic on the text, so no time zone or daylight saving change can
// skip or repeat one.

// The API's earliest summary month.
export const MIN_MONTH = '1900-01'

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

const pad = (number, width) => String(number).padStart(width, '0')

/** The user's current month in their own time zone, e.g. "2026-10". */
export function currentMonth(now = new Date()) {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}`
}

/** True if `value` is a real month as YYYY-MM, from MIN_MONTH on. */
export function isValidMonth(value) {
  const match = MONTH_PATTERN.exec(value ?? '')
  if (!match) return false
  const month = Number(match[2])
  // Same-format YYYY-MM strings compare correctly as text.
  return month >= 1 && month <= 12 && value >= MIN_MONTH
}

/**
 * The month `count` months after `value` (before it, for a negative count).
 *
 * @param {string} value YYYY-MM
 * @param {number} count
 */
export function addMonths(value, count) {
  const [year, month] = MONTH_PATTERN.exec(value).slice(1).map(Number)
  const index = year * 12 + (month - 1) + count
  return `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1, 2)}`
}

// Built at UTC midnight and formatted in UTC, so the label is always the month asked for.
const labelFormat = new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** A month for display, e.g. "2026-10" → "October 2026". */
export function formatMonth(value) {
  const [year, month] = MONTH_PATTERN.exec(value).slice(1).map(Number)
  return labelFormat.format(new Date(Date.UTC(year, month - 1, 1)))
}
