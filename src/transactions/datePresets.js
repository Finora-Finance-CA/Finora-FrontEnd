// Date range presets for the transaction filters. A preset is only a shortcut for the
// From and To dates (the `from` and `to` URL params); nothing else is stored. Dates are
// YYYY-MM-DD in the user's own calendar, and the arithmetic runs on UTC dates built
// from those parts, so no time zone or daylight saving change can shift a day.

import { formatDate, todayLocal } from './dates'

export const DATE_PRESETS = Object.freeze([
  Object.freeze({ id: 'all', label: 'All time' }),
  Object.freeze({ id: 'this-month', label: 'This month' }),
  Object.freeze({ id: 'last-month', label: 'Last month' }),
  Object.freeze({ id: 'last-90-days', label: 'Last 90 days' }),
  Object.freeze({ id: 'custom', label: 'Custom' }),
])

// Every preset but Custom, which is whatever the dates are.
const FIXED_PRESETS = DATE_PRESETS.filter(({ id }) => id !== 'custom')

const pad = (number, width = 2) => String(number).padStart(width, '0')

/** A UTC timestamp as YYYY-MM-DD. */
function toText(timestamp) {
  const date = new Date(timestamp)
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/**
 * The From and To dates a preset stands for, both inclusive.
 * - This month: the 1st to the last day of the current month.
 * - Last month: the whole of the month before.
 * - Last 90 days: today and the 89 days before it.
 * - All time: no dates.
 *
 * @param {'all'|'this-month'|'last-month'|'last-90-days'} id
 * @param {string} [today] YYYY-MM-DD; defaults to the user's local date.
 * @returns {{ from: string, to: string }}
 */
export function presetRange(id, today = todayLocal()) {
  const [year, month, day] = today.split('-').map(Number)
  const monthIndex = month - 1
  // Date.UTC rolls over out-of-range days: day 0 is the last day of the month before.
  switch (id) {
    case 'this-month':
      return { from: toText(Date.UTC(year, monthIndex, 1)), to: toText(Date.UTC(year, monthIndex + 1, 0)) }
    case 'last-month':
      return { from: toText(Date.UTC(year, monthIndex - 1, 1)), to: toText(Date.UTC(year, monthIndex, 0)) }
    case 'last-90-days':
      return { from: toText(Date.UTC(year, monthIndex, day - 89)), to: today }
    default:
      return { from: '', to: '' }
  }
}

/**
 * Which preset the dates match, or 'custom' if none does.
 *
 * @param {{ from: string, to: string }} range
 * @param {string} [today]
 */
export function matchPreset({ from, to }, today = todayLocal()) {
  const match = FIXED_PRESETS.find(({ id }) => {
    const range = presetRange(id, today)
    return range.from === from && range.to === to
  })
  return match ? match.id : 'custom'
}

/**
 * A short label for the dates, for the filter's button: the preset's name, or the
 * dates themselves, e.g. "Sep 1, 2026 to Sep 30, 2026" or "From Sep 1, 2026".
 *
 * @param {{ from: string, to: string }} range
 * @param {string} [today]
 */
export function describeRange({ from, to }, today = todayLocal()) {
  const preset = matchPreset({ from, to }, today)
  if (preset !== 'custom') return DATE_PRESETS.find(({ id }) => id === preset).label
  if (from && to) return `${formatDate(from)} to ${formatDate(to)}`
  if (from) return `From ${formatDate(from)}`
  return `Until ${formatDate(to)}`
}
