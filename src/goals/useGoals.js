// Loads the signed-in user's savings goals and keeps the list current after a save,
// a contribution or a delete. The same shape as useBudgets.

import { useCallback, useEffect, useState } from 'react'
import { listGoals } from '../api/goals'

/**
 * @returns {{
 *   status: 'loading'|'loaded'|'error',
 *   goals: object[],
 *   error: import('../api/client').ApiError|Error|null,
 *   reload: () => void,
 *   showSaved: (goal: object) => void,
 *   showRemoved: (id: string) => void,
 * }} Goals newest first, as the API returns them.
 */
export function useGoals() {
  const [result, setResult] = useState({ version: null, status: 'loading', goals: [], error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true
    listGoals().then(
      (goals) => {
        if (isCurrent) setResult({ version, status: 'loaded', goals, error: null })
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

  // A new goal goes first (newest first); a changed one stays where it is.
  const showSaved = useCallback((goal) => {
    setResult((current) => {
      const exists = current.goals.some((item) => item.id === goal.id)
      const goals = exists ? current.goals.map((item) => (item.id === goal.id ? goal : item)) : [goal, ...current.goals]
      return { ...current, goals }
    })
  }, [])

  const showRemoved = useCallback((id) => {
    setResult((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }))
  }, [])

  // Try again after an error shows the loading state.
  let status = result.status
  if (result.version === null || (result.version !== version && result.status === 'error')) status = 'loading'

  return {
    status,
    goals: result.goals,
    error: status === 'error' ? result.error : null,
    reload,
    showSaved,
    showRemoved,
  }
}
