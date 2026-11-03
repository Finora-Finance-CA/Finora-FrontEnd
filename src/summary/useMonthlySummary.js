// Loads the signed-in user's totals for one month, and again when the month changes,
// the user asks to try again, or a transaction changes (see useMonthData).

import { getMonthlySummary } from '../api/summary'
import { useMonthData } from './useMonthData'

/**
 * @param {string} month YYYY-MM
 * @returns {{
 *   status: 'loading'|'loaded'|'error',
 *   isRefreshing: boolean,
 *   summary: import('../api/summary').MonthlySummary|null,
 *   error: import('../api/client').ApiError|Error|null,
 *   reload: () => void,
 * }}
 *   While another month loads, the last one stays on screen with `isRefreshing`
 *   true, so the cards don't flash empty when stepping through months.
 */
export function useMonthlySummary(month) {
  const { data, ...rest } = useMonthData(month, getMonthlySummary)
  return { ...rest, summary: data }
}
