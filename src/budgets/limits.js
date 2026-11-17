// Reading a budget limit typed in dollars (US-33). The same parsing and messages as every
// other money field (parseDollarsToCents), labelled "Limit": no floating point anywhere.

import { parseDollarsToCents } from '../transactions/money'

/**
 * Parses a monthly limit typed in dollars, e.g. "500", "$1,250.50" or " 12 ".
 *
 * @param {string} input
 * @returns {{ cents: number, error: null } | { cents: null, error: string }}
 */
export function parseLimitToCents(input) {
  return parseDollarsToCents(input, 'Limit')
}
