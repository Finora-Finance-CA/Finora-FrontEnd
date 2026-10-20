// Loads the signed-in user's totals for one month, and again when the month changes
// or the user asks to try again.

import { useCallback, useEffect, useState } from 'react'
import { getMonthlySummary } from '../api/summary'

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
  // `key` says which request the stored result answers. null until the first answer.
  const [result, setResult] = useState({ key: null, status: 'loading', summary: null, error: null })
  const [version, setVersion] = useState(0)
  const requestKey = `${month}#${version}`

  useEffect(() => {
    // Only the newest request may change what's shown, and nothing changes after the
    // page has closed.
    let isCurrent = true
    getMonthlySummary(month).then(
      (summary) => {
        if (isCurrent) setResult({ key: requestKey, status: 'loaded', summary, error: null })
      },
      (error) => {
        if (isCurrent) setResult((current) => ({ ...current, key: requestKey, status: 'error', error }))
      }
    )
    return () => {
      isCurrent = false
    }
  }, [month, requestKey])

  const reload = useCallback(() => setVersion((current) => current + 1), [])

  let status = result.status
  let isRefreshing = false
  if (result.key !== requestKey) {
    isRefreshing = result.status === 'loaded'
    status = isRefreshing ? 'loaded' : 'loading'
  }

  return {
    status,
    isRefreshing,
    summary: result.summary,
    error: status === 'error' ? result.error : null,
    reload,
  }
}
