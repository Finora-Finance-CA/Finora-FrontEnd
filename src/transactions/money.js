// Converts between dollar text ("19.99") and the integer cents the API stores (1999),
// in both directions with whole-number maths only. Floating point would round wrongly:
// 19.99 * 100 gives 1998.9999999999998.

import { MESSAGES } from '../validation/rules'
import { MAX_AMOUNT_CENTS } from './constants'

// Digits with optional comma grouping ("1,234") or none ("1234"), then up to two
// decimals. A leading "." is allowed (".5"), and so is a trailing one ("5.").
const AMOUNT_PATTERN = /^(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d*))?$/

/**
 * Reads a dollar amount typed by the user, without deciding how to word a problem.
 * parseDollarsToCents turns the reason into the shared message for any money field.
 *
 * Accepts an optional leading "$" and surrounding spaces, e.g. "19.99", "$5",
 * "1,250.5" or ".75". A minus sign in front of a valid amount ("-5", "-$5", "$-5") is
 * read as 'negative', so the user is told the amount must be greater than 0.
 *
 * @param {string} input
 * @returns {{ cents: number, reason: null }
 *   | { cents: null, reason: 'empty'|'format'|'decimals'|'zero'|'negative'|'too_large' }}
 */
export function readDollars(input) {
  const raw = String(input ?? '').trim()
  if (raw === '') return { cents: null, reason: 'empty' }

  const negative = /^(?:-\s*\$?|\$\s*-)\s*/.exec(raw)
  if (negative) {
    const rest = readDollars(raw.slice(negative[0].length))
    return rest.reason === null || rest.reason === 'zero' || rest.reason === 'too_large'
      ? { cents: null, reason: 'negative' }
      : { cents: null, reason: rest.reason === 'empty' ? 'format' : rest.reason }
  }

  const text = raw.replace(/^\$\s*/, '')
  const match = AMOUNT_PATTERN.exec(text)
  if (!match) return { cents: null, reason: 'format' }

  const dollars = match[1].replace(/,/g, '')
  const fraction = match[2] ?? ''
  if (dollars === '' && fraction === '') return { cents: null, reason: 'format' }
  if (fraction.length > 2) return { cents: null, reason: 'decimals' }

  // Strings of more than 15 digits lose precision as Numbers, but anything that
  // long is far above the maximum and is rejected below either way.
  const cents = Number(dollars || '0') * 100 + Number(fraction.padEnd(2, '0'))

  if (cents <= 0) return { cents: null, reason: 'zero' }
  if (cents > MAX_AMOUNT_CENTS) return { cents: null, reason: 'too_large' }
  return { cents, reason: null }
}

const MESSAGE_FOR_REASON = {
  empty: MESSAGES.required,
  format: MESSAGES.amountFormat,
  decimals: MESSAGES.decimals,
  zero: MESSAGES.positive,
  negative: MESSAGES.positive,
  too_large: MESSAGES.maxAmount,
}

/**
 * Parses a money amount typed in dollars into integer cents, with the shared message
 * (../validation/rules.js) for any problem. Used by every money field: a transaction's
 * amount, a budget limit, a goal's target and a contribution.
 *
 * @param {string} input
 * @param {string} [label] How the message names the field, e.g. "Limit".
 * @returns {{ cents: number, error: null } | { cents: null, error: string }}
 */
export function parseDollarsToCents(input, label = 'Amount') {
  const { cents, reason } = readDollars(input)
  return reason ? { cents: null, error: MESSAGE_FOR_REASON[reason](label) } : { cents, error: null }
}

/**
 * Integer cents as plain dollar text, e.g. 1999 → "19.99" and 5 → "0.05". This is the
 * format the amount field accepts, so the edit form starts from the saved amount.
 *
 * @param {number} cents A whole number.
 * @throws {TypeError} If `cents` is not a safe whole number.
 */
export function centsToDollarString(cents) {
  if (!Number.isSafeInteger(cents)) {
    throw new TypeError(`Expected a whole number of cents, got ${cents}.`)
  }
  const absolute = Math.abs(cents)
  const remainder = absolute % 100
  // absolute - remainder is a multiple of 100, so this division is exact.
  const dollars = (absolute - remainder) / 100
  return `${cents < 0 ? '-' : ''}${dollars}.${String(remainder).padStart(2, '0')}`
}

const currencyFormat = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

/**
 * Formats integer cents for display, e.g. 1999 → "$19.99". Intl formats the decimal
 * text exactly, so the amount never passes through a binary fraction.
 */
export function formatCents(cents) {
  return currencyFormat.format(centsToDollarString(cents))
}
