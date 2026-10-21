import { useEffect, useRef, useState } from 'react'
import { deleteBudget } from '../api/budgets'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import { useIsMountedRef } from '../hooks/useIsMountedRef'
import { formatCents } from '../transactions/money'

/**
 * Asks the user to confirm removing a category's monthly limit, then removes it. Cancel
 * is focused first, so pressing Enter by accident removes nothing. Nothing can be
 * clicked or closed while the request is running.
 *
 * @param {object} props
 * @param {import('../api/budgets').Budget} props.budget
 * @param {() => void} props.onRemoved
 * @param {() => void} props.onNotFound Called if it was already removed.
 * @param {() => void} props.onClose Called on Cancel or Escape, without removing.
 * @param {{ current: HTMLElement|null }} [props.returnFocusRef] See Dialog.
 * @param {{ current: HTMLElement|null }} [props.fallbackFocusRef] See Dialog.
 */
export default function RemoveBudgetDialog({ budget, onRemoved, onNotFound, onClose, returnFocusRef, fallbackFocusRef }) {
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState(null)
  const cancelRef = useRef(null)
  const isRemovingRef = useRef(false)
  const isMountedRef = useIsMountedRef()

  // The focused Remove button was disabled during the request, which drops focus to
  // the page. Bring it back to a safe place in the dialog once the error shows.
  useEffect(() => {
    if (error) cancelRef.current?.focus()
  }, [error])

  async function handleRemove() {
    if (isRemovingRef.current) return
    isRemovingRef.current = true
    setIsRemoving(true)
    setError(null)

    let failure = null
    try {
      await deleteBudget(budget.id)
    } catch (err) {
      failure = err
    }

    isRemovingRef.current = false
    if (!isMountedRef.current) return
    if (!failure) {
      onRemoved()
    } else if (failure.kind === 'not_found') {
      onNotFound()
    } else {
      setIsRemoving(false)
      setError(failure)
    }
  }

  return (
    <Dialog
      title={`Remove the ${budget.category} limit?`}
      onClose={onClose}
      canClose={!isRemoving}
      initialFocusRef={cancelRef}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      <p>
        Your {formatCents(budget.limit_cents)} monthly limit for {budget.category} will be removed. Your transactions
        won't change, and you can set a new limit at any time.
      </p>

      {error && <ErrorAlert error={error} context="The limit was not removed." />}

      <div className="dialog__actions">
        <Button ref={cancelRef} onClick={onClose} disabled={isRemoving}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleRemove} disabled={isRemoving}>
          {isRemoving ? 'Removing…' : 'Remove limit'}
        </Button>
      </div>
    </Dialog>
  )
}
