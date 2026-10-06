// Converts between what people type ("19.99") and the integer cents the API
// stores (1999). The text is split into dollars and cents and each part is read
// as a whole number, so there is no floating point rounding (19.99 * 100 would
// give 1998.9999999999998).

import { MAX_AMOUNT_CENTS } from './constants'

// Digits with optional comma grouping ("1,234") or none ("1234"), then up to two
// decimals. A leading "." is allowed (".5"), and so is a trailing one ("5.").
const AMOUNT_PATTERN = /^(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d*))?$/

/**
 * Parses a dollar amount typed by the user.
 *
 * Accepts an optional leading "$" and surrounding spaces, e.g. "19.99", "$5",
 * "1,250.5" or ".75".
 *
 * @param {string} input
 * @returns {{ cents: number, error: null } | { cents: null, error: string }}
 */
export function parseDollarsToCents(input) {
  const text = String(input ?? '').trim().replace(/^\$\s*/, '')
  if (text === '') return { cents: null, error: 'Enter an amount.' }

  const match = AMOUNT_PATTERN.exec(text)
  if (!match) {
    return { cents: null, error: 'Enter the amount as a number, like 12.50.' }
  }

  const dollars = match[1].replace(/,/g, '')
  const fraction = match[2] ?? ''
  if (dollars === '' && fraction === '') {
    return { cents: null, error: 'Enter the amount as a number, like 12.50.' }
  }
  if (fraction.length > 2) {
    return { cents: null, error: 'Use at most two decimal places, like 12.50.' }
  }

  // Strings of more than 15 digits lose precision as Numbers, but anything that
  // long is far above the maximum and is rejected below either way.
  const cents = Number(dollars || '0') * 100 + Number(fraction.padEnd(2, '0'))

  if (cents <= 0) return { cents: null, error: 'Enter an amount greater than zero.' }
  if (cents > MAX_AMOUNT_CENTS) {
    return { cents: null, error: `Enter an amount no more than ${formatCents(MAX_AMOUNT_CENTS)}.` }
  }
  return { cents, error: null }
}

const currencyFormat = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

/** Formats integer cents for display, e.g. 1999 → "$19.99". */
export function formatCents(cents) {
  return currencyFormat.format(cents / 100)
}
