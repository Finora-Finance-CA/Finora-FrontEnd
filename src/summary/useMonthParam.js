// The month a page shows, kept in the URL (?month=2026-10) so refresh and Back keep
// it. Without one, or with an invalid one, it's the user's current month, which is left
// out of the URL. Used by /summary and /budgets.

import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { currentMonth, isValidMonth } from './months'

/**
 * @returns {{ month: string, thisMonth: string, showMonth: (month: string) => void }}
 *   `month` and `thisMonth` are YYYY-MM. `showMonth` adds a history entry.
 */
export function useMonthParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const thisMonth = currentMonth()
  const requested = searchParams.get('month')
  const month = isValidMonth(requested) ? requested : thisMonth

  const showMonth = useCallback(
    (next) => setSearchParams(next === thisMonth ? {} : { month: next }),
    [setSearchParams, thisMonth]
  )

  return { month, thisMonth, showMonth }
}
