import { useRef, useState } from 'react'
import { deleteGoal } from '../api/goals'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import { useIsMountedRef } from '../hooks/useIsMountedRef'
import { formatCents } from '../transactions/money'

/**
 * Asks before deleting a goal, with Cancel focused first. A goal someone already
 * deleted counts as deleted.
 *
 * @param {object} props
 * @param {object} props.goal
 * @param {(id: string, alreadyDeleted?: boolean) => void} props.onDeleted
 * @param {() => void} props.onClose
 * @param {{ current: HTMLElement|null }} [props.returnFocusRef]
 * @param {{ current: HTMLElement|null }} [props.fallbackFocusRef]
 */
export default function DeleteGoalDialog({ goal, onDeleted, onClose, returnFocusRef, fallbackFocusRef }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)
  const pendingRef = useRef(false)
  const cancelRef = useRef(null)
  const isMountedRef = useIsMountedRef()

  async function handleDelete() {
    if (pendingRef.current) return
    pendingRef.current = true
    setIsDeleting(true)
    setError(null)

    let failure = null
    try {
      await deleteGoal(goal.id)
    } catch (err) {
      failure = err
    }
    pendingRef.current = false
    if (!isMountedRef.current) return
    setIsDeleting(false)

    if (!failure) onDeleted(goal.id)
    else if (failure.kind === 'not_found') onDeleted(goal.id, true)
    else {
      if (!failure.kind) console.error(failure)
      setError(failure)
    }
  }

  return (
    <Dialog
      title="Delete savings goal?"
      onClose={onClose}
      canClose={!isDeleting}
      initialFocusRef={cancelRef}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      <p>
        Delete “{goal.name}”, with <span className="tabular">{formatCents(goal.saved_cents)}</span> saved of{' '}
        <span className="tabular">{formatCents(goal.target_cents)}</span>? This can’t be undone.
      </p>

      {error && <ErrorAlert error={error} context="The goal was not deleted." />}

      <div className="dialog__actions">
        <Button ref={cancelRef} onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting…' : 'Delete goal'}
        </Button>
      </div>
    </Dialog>
  )
}
