import { validateDate } from '../validation/rules'

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

/**
 * True if `value` is a real calendar date as YYYY-MM-DD, from MIN_DATE to MAX_DATE: the
 * same rule as the forms and the API (validateDate in ../validation/rules.js).
 */
export function isValidDate(value) {
  return validateDate(value ?? '', 'Date') === null
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
