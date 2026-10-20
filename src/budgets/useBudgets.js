// Loads the signed-in user's budgets and keeps them current after a save or delete.

import { useCallback, useEffect, useState } from 'react'
import { listBudgets } from '../api/budgets'

/**
 * @returns {{
 *   status: 'loading'|'loaded'|'error',
 *   budgetsByCategory: Record<string, import('../api/budgets').Budget>,
 *   error: import('../api/client').ApiError|Error|null,
 *   reload: () => void,
 *   showSaved: (budget: import('../api/budgets').Budget) => void,
 *   showRemoved: (category: string) => void,
 * }}
 */
export function useBudgets() {
  const [result, setResult] = useState({ version: null, status: 'loading', budgets: [], error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true
    listBudgets().then(
      (budgets) => {
        if (isCurrent) setResult({ version, status: 'loaded', budgets, error: null })
      },
      (error) => {
        if (isCurrent) setResult((current) => ({ ...current, version, status: 'error', error }))
      }
    )
    return () => {
      isCurrent = false
    }
  }, [version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])

  // A save or delete is shown straight away; there's one budget per category, so the
  // list never needs re-sorting.
  const showSaved = useCallback((budget) => {
    setResult((current) => ({
      ...current,
      budgets: [...current.budgets.filter((item) => item.category !== budget.category), budget],
    }))
  }, [])

  const showRemoved = useCallback((category) => {
    setResult((current) => ({ ...current, budgets: current.budgets.filter((item) => item.category !== category) }))
  }, [])

  // Loading again after an error (Try again) shows the loading state; loading again
  // after a 409 or 404 keeps the rows on screen until the fresh list arrives.
  let status = result.status
  if (result.version !== version && result.status === 'error') status = 'loading'
  if (result.version === null) status = 'loading'

  return {
    status,
    budgetsByCategory: Object.fromEntries(result.budgets.map((budget) => [budget.category, budget])),
    error: status === 'error' ? result.error : null,
    reload,
    showSaved,
    showRemoved,
  }
}
