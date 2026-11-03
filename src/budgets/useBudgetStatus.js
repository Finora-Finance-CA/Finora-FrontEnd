// Loads spending against each budget for one month (US-36, US-37), and again when the
// month changes, the user asks to try again, or a transaction changes (US-38). The
// Dashboard can use it too.

import { getBudgetStatus } from '../api/budgets'
import { useMonthData } from '../summary/useMonthData'

/**
 * @param {string} month YYYY-MM
 * @returns {{
 *   status: 'loading'|'loaded'|'error',
 *   isRefreshing: boolean,
 *   budgets: import('../api/budgets').BudgetStatus[],
 *   statusByCategory: Record<string, import('../api/budgets').BudgetStatus>,
 *   error: import('../api/client').ApiError|Error|null,
 *   reload: () => void,
 * }}
 *   While it loads again, the last figures stay on screen with `isRefreshing` true.
 */
export function useBudgetStatus(month) {
  const { data, ...rest } = useMonthData(month, getBudgetStatus)
  const budgets = data?.budgets ?? []
  return {
    ...rest,
    budgets,
    statusByCategory: Object.fromEntries(budgets.map((item) => [item.category, item])),
  }
}
