import { useEffect, useRef, useState } from 'react'
import { deleteTransaction } from '../api/transactions'
import Dialog from '../components/Dialog'
import ErrorAlert from '../components/ErrorAlert'
import { useIsMountedRef } from '../hooks/useIsMountedRef'
import { TRANSACTION_TYPES } from './constants'
import { formatDate } from './dates'
import { formatCents } from './money'
import '../components/buttons.css'
import './DeleteTransactionDialog.css'

/**
 * Asks the user to confirm deleting a transaction, then deletes it. Cancel is focused
 * first so that pressing Enter by accident doesn't delete anything. Nothing can be
 * clicked or closed while the request is running.
 *
 * @param {object} props
 * @param {object} props.transaction
 * @param {(transaction: object) => void} props.onDeleted
 * @param {(transaction: object) => void} props.onNotFound Called if it was already gone.
 * @param {() => void} props.onClose Called on Cancel or Escape, without deleting.
 * @param {{ current: HTMLElement|null }} [props.returnFocusRef] See Dialog.
 * @param {{ current: HTMLElement|null }} [props.fallbackFocusRef] See Dialog.
 */
export default function DeleteTransactionDialog({
  transaction,
  onDeleted,
  onNotFound,
  onClose,
  returnFocusRef,
  fallbackFocusRef,
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)
  const cancelRef = useRef(null)
  // Blocks a second click fired before the button re-renders as disabled.
  const isDeletingRef = useRef(false)
  const isMountedRef = useIsMountedRef()

  const { type, category, description, date, amount_cents: cents } = transaction
  const typeLabel = TRANSACTION_TYPES[type].label

  // The focused Delete button was disabled during the request, which drops focus to
  // the page. Bring it back to a safe place in the dialog once the error shows.
  useEffect(() => {
    if (error) cancelRef.current?.focus()
  }, [error])

  async function handleDelete() {
    if (isDeletingRef.current) return
    isDeletingRef.current = true
    setIsDeleting(true)
    setError(null)

    let failure = null
    try {
      await deleteTransaction(transaction.id)
    } catch (err) {
      failure = err
    }

    isDeletingRef.current = false
    if (!isMountedRef.current) return
    if (!failure) {
      onDeleted(transaction)
    } else if (failure.kind === 'not_found') {
      onNotFound(transaction)
    } else {
      setIsDeleting(false)
      setError(failure)
    }
  }

  return (
    <Dialog
      title="Delete this transaction?"
      onClose={onClose}
      canClose={!isDeleting}
      initialFocusRef={cancelRef}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      <dl className="delete-summary">
        <div>
          <dt>Amount</dt>
          <dd>{formatCents(cents)}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatDate(date)}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{category ? `${typeLabel}, ${category}` : typeLabel}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{description || 'No description'}</dd>
        </div>
      </dl>
      <p>This can't be undone.</p>

      {error && <ErrorAlert error={error} context="The transaction was not deleted." />}

      <div className="dialog__actions">
        <button
          ref={cancelRef}
          type="button"
          className="button button--secondary"
          onClick={onClose}
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button type="button" className="button button--danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Dialog>
  )
}
