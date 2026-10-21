import { useRef, useState } from 'react'
import Dialog from '../components/ui/Dialog'
import { TRANSACTION_TYPES } from './constants'
import TransactionForm from './TransactionForm'

/**
 * Adds an expense or an income, in a drawer from the right (a bottom sheet on phones).
 * It opens on Amount, with Expense chosen; its title follows the type ("Add expense").
 * It can't be closed while a save is running. After a save it calls `onSaved` with the
 * new transaction and a message to show; the page then closes it, and focus goes back
 * to `returnFocusRef`.
 *
 * @param {object} props
 * @param {(transaction: object, message: string) => void} props.onSaved
 * @param {() => void} props.onClose
 * @param {{ current: HTMLElement|null }} [props.returnFocusRef] See Dialog.
 */
export default function AddTransactionDrawer({ onSaved, onClose, returnFocusRef }) {
  // Expense or income. Expense comes first because it's the more common entry.
  const [type, setType] = useState('expense')
  const [isSaving, setIsSaving] = useState(false)
  const amountRef = useRef(null)

  return (
    <Dialog
      variant="drawer"
      title={TRANSACTION_TYPES[type].title}
      onClose={onClose}
      canClose={!isSaving}
      initialFocusRef={amountRef}
      returnFocusRef={returnFocusRef}
    >
      <TransactionForm
        type={type}
        onTypeChange={setType}
        onSaved={onSaved}
        onCancel={onClose}
        onSubmittingChange={setIsSaving}
        firstFieldRef={amountRef}
      />
    </Dialog>
  )
}
