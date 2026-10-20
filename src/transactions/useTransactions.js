// Loads one page of the signed-in user's transactions for the current search and
// filters, and loads it again after an add, edit or delete. The API does the search,
// filtering and paging, so the page on screen always matches what it returns.

import { useCallback, useEffect, useState } from 'react'
import { listTransactions } from '../api/transactions'
import { TRANSACTION_PAGE_SIZE } from './constants'
import { readListQuery, writeListQuery } from './listQuery'
import { removeTransaction, replaceTransaction } from './transactionList'

const NO_RESULTS = Object.freeze({
  transactions: Object.freeze([]),
  pagination: Object.freeze({ page: 1, page_size: TRANSACTION_PAGE_SIZE, total_count: 0, total_pages: 0 }),
})

/**
 * @param {import('./listQuery').ListQuery} query What to show.
 * @param {{ enabled?: boolean }} [options] With `enabled: false` nothing is loaded,
 *   e.g. while the date range is the wrong way round.
 * @returns {{
 *   status: 'idle'|'loading'|'loaded'|'error',
 *   isRefreshing: boolean,
 *   transactions: object[],
 *   pagination: { page: number, page_size: number, total_count: number, total_pages: number },
 *   error: import('../api/client').ApiError|Error|null,
 *   reload: () => void,
 *   showSaved: (transaction: object) => void,
 *   showRemoved: (id: string) => void,
 * }}
 *   `isRefreshing` is true while a newer page is loading and the previous one is still
 *   showing, so the list doesn't flash empty between pages, filters and saves.
 */
export function useTransactions(query, { enabled = true } = {}) {
  // `key` says which request the stored result answers. null until the first answer.
  const [result, setResult] = useState({ key: null, status: 'loading', ...NO_RESULTS, error: null })
  // Bumped to load the same query again (Try again, or after a change was saved).
  const [version, setVersion] = useState(0)

  const queryString = writeListQuery(query).toString()
  const requestKey = `${queryString}#${version}`

  useEffect(() => {
    if (!enabled) return undefined
    // Only the newest request may change what's shown: a slow, older response is
    // ignored, and nothing changes after the page has closed.
    let isCurrent = true
    listTransactions(readListQuery(new URLSearchParams(queryString))).then(
      (page) => {
        if (isCurrent) setResult({ key: requestKey, status: 'loaded', ...page, error: null })
      },
      (error) => {
        if (isCurrent) setResult((current) => ({ ...current, key: requestKey, status: 'error', error }))
      }
    )
    return () => {
      isCurrent = false
    }
  }, [enabled, queryString, requestKey])

  const reload = useCallback(() => setVersion((current) => current + 1), [])

  const patchAndReload = useCallback((change) => {
    setResult((current) =>
      current.status === 'loaded' ? { ...current, transactions: change(current.transactions) } : current
    )
    setVersion((current) => current + 1)
  }, [])

  // An edit shows in its row straight away; the reload then moves it if its date
  // changed, or drops it if it no longer matches the filters.
  const showSaved = useCallback(
    (transaction) => patchAndReload((list) => replaceTransaction(list, transaction)),
    [patchAndReload]
  )

  const showRemoved = useCallback((id) => patchAndReload((list) => removeTransaction(list, id)), [patchAndReload])

  let status = result.status
  let isRefreshing = false
  if (!enabled) {
    status = 'idle'
  } else if (result.key !== requestKey) {
    // A newer request is out. Keep showing the last page while it loads; after an
    // error (or before any answer) show the loading state instead.
    isRefreshing = result.status === 'loaded'
    status = isRefreshing ? 'loaded' : 'loading'
  }

  return {
    status,
    isRefreshing,
    transactions: result.transactions,
    pagination: result.pagination,
    error: status === 'error' ? result.error : null,
    reload,
    showSaved,
    showRemoved,
  }
}
