// Loads the signed-in user's recent transactions and keeps the list current after
// adds, edits and deletes. A minimal list on purpose: the Sprint 2 list story adds
// paging, search and filters on top of this.

import { useCallback, useEffect, useRef, useState } from 'react'
import { listTransactions } from '../api/transactions'
import { compareNewestFirst, removeTransaction, upsertTransaction } from './transactionList'

/**
 * @returns {{
 *   status: 'loading'|'loaded'|'error',
 *   transactions: object[],
 *   error: import('../api/client').ApiError|Error|null,
 *   reload: () => void,
 *   showSaved: (transaction: object) => void,
 *   showRemoved: (id: string) => void,
 * }}
 */
export function useTransactions() {
  const [state, setState] = useState({ status: 'loading', transactions: [], error: null })
  // Every load gets a number and only the newest may change the list, so a slow
  // response can't overwrite newer data, and nothing changes after unmount.
  const latestRequestRef = useRef(0)
  const isLoadingRef = useRef(false)

  const fetchList = useCallback(async () => {
    const requestId = ++latestRequestRef.current
    isLoadingRef.current = true
    try {
      const transactions = await listTransactions()
      if (requestId === latestRequestRef.current) {
        setState({ status: 'loaded', transactions: [...transactions].sort(compareNewestFirst), error: null })
      }
    } catch (error) {
      if (requestId === latestRequestRef.current) {
        setState((current) => ({ ...current, status: 'error', error }))
      }
    } finally {
      if (requestId === latestRequestRef.current) isLoadingRef.current = false
    }
  }, [])

  const ignorePendingLoads = useCallback(() => {
    latestRequestRef.current += 1
  }, [])

  useEffect(() => {
    fetchList()
    return ignorePendingLoads
  }, [fetchList, ignorePendingLoads])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    fetchList()
  }, [fetchList])

  const applyLocally = useCallback(
    (change) => {
      // A load still running may have been answered before this change was saved.
      // Start a fresh one instead; it supersedes the old one and includes the change.
      if (isLoadingRef.current) {
        fetchList()
        return
      }
      setState((current) =>
        current.status === 'loaded' ? { ...current, transactions: change(current.transactions) } : current
      )
    },
    [fetchList]
  )

  const showSaved = useCallback(
    (transaction) => applyLocally((list) => upsertTransaction(list, transaction)),
    [applyLocally]
  )

  const showRemoved = useCallback((id) => applyLocally((list) => removeTransaction(list, id)), [applyLocally])

  return { ...state, reload, showSaved, showRemoved }
}
