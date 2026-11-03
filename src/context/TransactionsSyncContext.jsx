import { useCallback, useMemo, useState } from 'react'
import { TransactionsSyncContext } from './useTransactionsSync'

/**
 * Wraps the signed-in pages so they can tell each other when transactions change
 * (US-38). Inside the protected routes, so signing out starts it again from zero.
 */
export function TransactionsSyncProvider({ children }) {
  const [version, setVersion] = useState(0)
  const notifyTransactionsChanged = useCallback(() => setVersion((current) => current + 1), [])
  const value = useMemo(() => ({ version, notifyTransactionsChanged }), [version, notifyTransactionsChanged])

  return <TransactionsSyncContext.Provider value={value}>{children}</TransactionsSyncContext.Provider>
}
