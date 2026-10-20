// Converts between dollar text ("19.99") and the integer cents the API stores (1999),
// in both directions with whole-number maths only. Floating point would round wrongly:
// 19.99 * 100 gives 1998.9999999999998.

import { MAX_AMOUNT_CENTS } from './constants'

// Digits with optional comma grouping ("1,234") or none ("1234"), then up to two
// decimals. A leading "." is allowed (".5"), and so is a trailing one ("5.").
const AMOUNT_PATTERN = /^(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d*))?$/

/**
 * Reads a dollar amount typed by the user, without deciding how to word a problem.
 * Both the transaction form and the budget form use it, each with its own messages.
 *
 * Accepts an optional leading "$" and surrounding spaces, e.g. "19.99", "$5",
 * "1,250.5" or ".75". A minus sign isn't accepted, so "-1" is a 'format' problem.
 *
 * @param {string} input
 * @returns {{ cents: number, reason: null }
 *   | { cents: null, reason: 'empty'|'format'|'decimals'|'zero'|'too_large' }}
 */
export function readDollars(input) {
  const text = String(input ?? '').trim().replace(/^\$\s*/, '')
  if (text === '') return { cents: null, reason: 'empty' }

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

const AMOUNT_MESSAGES = {
  empty: 'Enter an amount.',
  format: 'Enter the amount as a number, like 12.50.',
  decimals: 'Use at most two decimal places, like 12.50.',
  zero: 'Enter an amount greater than zero.',
}

/**
 * Parses a transaction amount typed by the user. See readDollars for what's accepted.
 *
 * @param {string} input
 * @returns {{ cents: number, error: null } | { cents: null, error: string }}
 */
export function parseDollarsToCents(input) {
  const { cents, reason } = readDollars(input)
  if (!reason) return { cents, error: null }
  const error =
    reason === 'too_large' ? `Enter an amount no more than ${formatCents(MAX_AMOUNT_CENTS)}.` : AMOUNT_MESSAGES[reason]
  return { cents: null, error }
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
