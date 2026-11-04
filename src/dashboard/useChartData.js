// Loads the dashboard charts' data for one month (US-43, US-44), and again when the
// month changes, on Try again, after a transaction changes and when the tab is shown
// again (see useMonthData).

import { getCategorySpending, getSpendingTrend } from '../api/summary'
import { useMonthData } from '../summary/useMonthData'

/** @param {string} month YYYY-MM */
export function useCategorySpending(month) {
  const { data, ...rest } = useMonthData(month, getCategorySpending)
  return { ...rest, spending: data }
}

/** @param {string} month YYYY-MM, the last of the 6 months shown. */
export function useSpendingTrend(month) {
  const { data, ...rest } = useMonthData(month, getSpendingTrend)
  return { ...rest, trend: data }
}