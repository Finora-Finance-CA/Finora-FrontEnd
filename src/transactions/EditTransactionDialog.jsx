import { useRef, useState } from 'react'
import Dialog from '../components/ui/Dialog'
import { TRANSACTION_TYPES } from './constants'
import TransactionForm from './TransactionForm'

/**
 * Edits a saved transaction in a drawer (a bottom sheet on phones), using the same form
 * as adding one, opened on Amount. Its type can't be changed. The drawer can't be closed
 * while a save is running.
 *
 * @param {object} props
 * @param {object} props.transaction
 * @param {(transaction: object) => void} props.onSaved Called with the updated transaction.
 * @param {(transaction: object) => void} props.onNotFound Called if it no longer exists.
 * @param {() => void} props.onClose Called on Cancel, Close or Escape, without saving.
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
  const amountRef = useRef(null)

  return (
    <Dialog
      variant="drawer"
      title={TRANSACTION_TYPES[transaction.type].editTitle}
      onClose={onClose}
      canClose={!isSaving}
      initialFocusRef={amountRef}
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
        firstFieldRef={amountRef}
      />
    </Dialog>
  )
}
