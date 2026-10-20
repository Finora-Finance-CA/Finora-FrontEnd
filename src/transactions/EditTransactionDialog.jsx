import { useState } from 'react'
import Dialog from '../components/Dialog'
import { TRANSACTION_TYPES } from './constants'
import TransactionForm from './TransactionForm'

/**
 * Edits a saved transaction in a dialog, using the same form as adding one. Its type
 * can't be changed. The dialog can't be closed while a save is running.
 *
 * @param {object} props
 * @param {object} props.transaction
 * @param {(transaction: object) => void} props.onSaved Called with the updated transaction.
 * @param {(transaction: object) => void} props.onNotFound Called if it no longer exists.
 * @param {() => void} props.onClose Called on Cancel or Escape, without saving.
 * @param {{ current: HTMLElement|null }} [props.returnFocusRef] See Dialog.
 * @param {{ current: HTMLElement|null }} [props.fallbackFocusRef] See Dialog.
 */
export default function EditTransactionDialog({
  transaction,
  onSaved,
  onNotFound,
  onClose,
  returnFocusRef,
  fallbackFocusRef,
}) {
  const [isSaving, setIsSaving] = useState(false)

  return (
    <Dialog
      title={TRANSACTION_TYPES[transaction.type].editTitle}
      onClose={onClose}
      canClose={!isSaving}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      <TransactionForm
        type={transaction.type}
        transaction={transaction}
        onSaved={onSaved}
        onNotFound={() => onNotFound(transaction)}
        onCancel={onClose}
        onSubmittingChange={setIsSaving}
      />
    </Dialog>
  )
}
