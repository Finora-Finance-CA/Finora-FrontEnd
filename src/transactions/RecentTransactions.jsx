import { useId, useRef, useState } from 'react'
import ErrorAlert from '../components/ErrorAlert'
import DeleteTransactionDialog from './DeleteTransactionDialog'
import EditTransactionDialog from './EditTransactionDialog'
import TransactionListItem from './TransactionListItem'
import '../components/buttons.css'
import './RecentTransactions.css'

const MESSAGES = {
  updated: 'Transaction updated.',
  deleted: 'Transaction deleted.',
  goneOnEdit: 'That transaction no longer exists, so it was removed from the list.',
  goneOnDelete: 'That transaction was already deleted, so it was removed from the list.',
}

/**
 * The "Recent transactions" section: the list with its loading, empty and error
 * states, and the edit and delete dialogs. A minimal list for the Sprint 2 list story
 * to extend with paging, search and filters.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('./useTransactions').useTransactions>} props.list
 */
export default function RecentTransactions({ list }) {
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [message, setMessage] = useState('')
  // The Edit or Delete button that opened the dialog gets focus back when it closes;
  // the heading does if that button's row has gone.
  const openerRef = useRef(null)
  const headingRef = useRef(null)
  const headingId = useId()

  function openDialog(open, transaction, opener) {
    openerRef.current = opener
    setMessage('')
    open(transaction)
  }

  function handleSaved(transaction) {
    list.showSaved(transaction)
    setEditing(null)
    setMessage(MESSAGES.updated)
  }

  function handleDeleted(transaction) {
    list.showRemoved(transaction.id)
    setDeleting(null)
    setMessage(MESSAGES.deleted)
  }

  function handleGone(transaction, text) {
    list.showRemoved(transaction.id)
    setEditing(null)
    setDeleting(null)
    setMessage(text)
  }

  return (
    <section className="recent-transactions" aria-labelledby={headingId}>
      <h2 id={headingId} ref={headingRef} tabIndex={-1}>
        Recent transactions
      </h2>

      <p className="recent-transactions__message" role="status">
        {message}
      </p>

      <ListContent
        list={list}
        onEdit={(transaction, opener) => openDialog(setEditing, transaction, opener)}
        onDelete={(transaction, opener) => openDialog(setDeleting, transaction, opener)}
      />

      {editing && (
        <EditTransactionDialog
          transaction={editing}
          onSaved={handleSaved}
          onNotFound={(transaction) => handleGone(transaction, MESSAGES.goneOnEdit)}
          onClose={() => setEditing(null)}
          returnFocusRef={openerRef}
          fallbackFocusRef={headingRef}
        />
      )}
      {deleting && (
        <DeleteTransactionDialog
          transaction={deleting}
          onDeleted={handleDeleted}
          onNotFound={(transaction) => handleGone(transaction, MESSAGES.goneOnDelete)}
          onClose={() => setDeleting(null)}
          returnFocusRef={openerRef}
          fallbackFocusRef={headingRef}
        />
      )}
    </section>
  )
}

function ListContent({ list, onEdit, onDelete }) {
  if (list.status === 'loading') {
    return (
      <p className="recent-transactions__note" role="status">
        Loading transactions…
      </p>
    )
  }

  if (list.status === 'error') {
    return (
      <div className="recent-transactions__error">
        <ErrorAlert error={list.error} context="We couldn't load your transactions." />
        {list.error?.kind !== 'unauthorized' && (
          <button type="button" className="button button--secondary" onClick={list.reload}>
            Try again
          </button>
        )}
      </div>
    )
  }

  if (list.transactions.length === 0) {
    return <p className="recent-transactions__note">No transactions yet. Add one above and it will show here.</p>
  }

  return (
    <ul className="transaction-list">
      {list.transactions.map((transaction) => (
        <TransactionListItem key={transaction.id} transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  )
}
