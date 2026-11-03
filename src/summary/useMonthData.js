// Loads one month of the signed-in user's data (the summary, budget status), and loads
// it again when the month changes, when the user asks to try again, after a
// transaction changes and when the tab is shown again (US-38).

import { useCallback, useEffect, useState } from 'react'
import { useTransactionsRefreshKey } from '../context/useTransactionsSync'

/**
 * @template T
 * @param {string} month YYYY-MM
 * @param {(month: string) => Promise<T>} load An API call. Must be the same function
 *   on every render (e.g. one imported from src/api), or it loads in a loop.
 * @returns {{
 *   status: 'loading'|'loaded'|'error',
 *   isRefreshing: boolean,
 *   data: T|null,
 *   error: import('../api/client').ApiError|Error|null,
 *   reload: () => void,
 * }}
 *   While it loads again, what was there stays on screen with `isRefreshing` true, so
 *   nothing flashes empty when stepping through months or after a change.
 */
export function useMonthData(month, load) {
  // `key` says which request the stored result answers. null until the first answer.
  const [result, setResult] = useState({ key: null, status: 'loading', data: null, error: null })
  const [version, setVersion] = useState(0)
  const refreshKey = useTransactionsRefreshKey()
  const requestKey = `${month}#${version}#${refreshKey}`

  useEffect(() => {
    // Only the newest request may change what's shown, and nothing changes after the
    // page has closed.
    let isCurrent = true
    load(month).then(
      (data) => {
        if (isCurrent) setResult({ key: requestKey, status: 'loaded', data, error: null })
      },
      (error) => {
        if (isCurrent) setResult((current) => ({ ...current, key: requestKey, status: 'error', error }))
      }
    )
    return () => {
      isCurrent = false
    }
  }, [month, load, requestKey])

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
    data: result.data,
    error: status === 'error' ? result.error : null,
    reload,
  }
}
