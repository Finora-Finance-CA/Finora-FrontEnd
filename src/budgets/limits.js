// Reading a budget limit typed in dollars (US-33). Uses the same string parsing as the
// transaction amount (readDollars in money.js), so there's no floating point anywhere,
// with messages written for a limit.

import { MAX_AMOUNT_CENTS } from '../transactions/constants'
import { formatCents, readDollars } from '../transactions/money'

export const LIMIT_REQUIRED = 'Enter a limit greater than zero.'

const LIMIT_MESSAGES = {
  // Empty, zero, negative ("-1" isn't a number the field accepts) and non-numeric
  // limits all get the same plain message.
  empty: LIMIT_REQUIRED,
  format: LIMIT_REQUIRED,
  zero: LIMIT_REQUIRED,
  decimals: 'Use at most two decimal places, like 500.00.',
  too_large: `Enter a limit no more than ${formatCents(MAX_AMOUNT_CENTS)}.`,
}

/**
 * Parses a monthly limit typed in dollars, e.g. "500", "$1,250.50" or " 12 ".
 *
 * @param {string} input
 * @returns {{ cents: number, error: null } | { cents: null, error: string }}
 */
export function parseLimitToCents(input) {
  const { cents, reason } = readDollars(input)
  return reason ? { cents: null, error: LIMIT_MESSAGES[reason] } : { cents, error: null }
}
