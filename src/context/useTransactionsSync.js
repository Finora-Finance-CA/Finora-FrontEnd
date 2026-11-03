// Lets figures built from transactions (budget status, the monthly summary) load again
// after a transaction is added, edited or deleted (US-38), and when the user comes back
// to the tab, in case it changed somewhere else.
//
// Kept apart from TransactionsSyncProvider (TransactionsSyncContext.jsx) so that file
// only exports a component, which React Fast Refresh needs to hot-reload it.

import { createContext, useContext, useEffect, useState } from 'react'

/**
 * @typedef {object} TransactionsSync
 * @property {number} version Goes up by one after every change.
 * @property {() => void} notifyTransactionsChanged Call after a create, edit or delete
 *   succeeds, or after finding that a transaction was already gone.
 */

// Outside the provider (e.g. a component tested on its own) nothing is listening, so
// notifying does nothing.
/** @type {import('react').Context<TransactionsSync>} */
export const TransactionsSyncContext = createContext({ version: 0, notifyTransactionsChanged: () => {} })

/** @returns {TransactionsSync} */
export function useTransactionsSync() {
  return useContext(TransactionsSyncContext)
}

/**
 * A value that changes whenever data built from transactions should load again: after
 * a change in this tab, or when the tab is shown again. Add it to a data hook's request
 * key.
 *
 * @returns {string}
 */
export function useTransactionsRefreshKey() {
  const { version } = useTransactionsSync()
  const [returns, setReturns] = useState(0)

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') setReturns((current) => current + 1)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return `${version}.${returns}`
}
