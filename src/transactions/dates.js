import { MIN_DATE } from './constants'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(number) {
  return String(number).padStart(2, '0')
}

/**
 * Today's date as YYYY-MM-DD in the user's local time zone. toISOString() would use
 * UTC, which gives tomorrow's date on an evening in Toronto.
 */
export function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** True if `value` is a real calendar date as YYYY-MM-DD, on or after MIN_DATE. */
export function isValidDate(value) {
  const match = DATE_PATTERN.exec(value ?? '')
  if (!match) return false

  const [year, month, day] = match.slice(1).map(Number)
  // Date.UTC rolls invalid days over (Feb 30 becomes Mar 2), so compare the parts back.
  const parsed = new Date(Date.UTC(year, month - 1, day))
  const isRealDate =
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day

  // Same-format YYYY-MM-DD strings compare correctly as text.
  return isRealDate && value >= MIN_DATE
}

// Formatted in UTC because the Date is built at UTC midnight; a local time zone could
// show the day before.
const displayFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/** A YYYY-MM-DD date for display, e.g. "2026-10-05" → "Oct 5, 2026". */
export function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return displayFormat.format(new Date(Date.UTC(year, month - 1, day)))
}
