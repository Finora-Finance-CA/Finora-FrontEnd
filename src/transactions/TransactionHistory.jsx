import { useId, useRef, useState } from 'react'
import ErrorAlert from '../components/ErrorAlert'
import DeleteTransactionDialog from './DeleteTransactionDialog'
import EditTransactionDialog from './EditTransactionDialog'
import Pagination from './Pagination'
import TransactionFilters from './TransactionFilters'
import TransactionListItem from './TransactionListItem'
import '../components/buttons.css'
import './TransactionHistory.css'

const MESSAGES = {
  updated: 'Transaction updated.',
  deleted: 'Transaction deleted.',
  goneOnEdit: 'That transaction no longer exists, so it was removed from the list.',
  goneOnDelete: 'That transaction was already deleted, so it was removed from the list.',
}

/**
 * The "Transaction history" section: search and filters, one page of transactions
 * with its loading, empty, no-match and error states, paging, and the edit and delete
 * dialogs.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('./useTransactions').useTransactions>} props.list
 * @param {import('./listQuery').ListQuery} props.query
 * @param {boolean} props.filtersActive
 * @param {boolean} props.rangeReversed
 * @param {(changes: object, options?: { replace?: boolean }) => void} props.onQueryChange
 * @param {() => void} props.onAddFirst Takes the user to the add form.
 */
export default function TransactionHistory({ list, query, filtersActive, rangeReversed, onQueryChange, onAddFirst }) {
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [message, setMessage] = useState('')
  // The Edit or Delete button that opened the dialog gets focus back when it closes;
  // the heading does if that button's row has gone.
  const openerRef = useRef(null)
  const headingRef = useRef(null)
  const searchRef = useRef(null)
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

  function handleQueryChange(changes, options) {
    setMessage('')
    onQueryChange(changes, options)
  }

  function clearFilters() {
    handleQueryChange({ q: '', categories: [], from: '', to: '' })
    searchRef.current?.focus()
  }

  // The button pressed may be disabled on the new page (Next on the last one), so move
  // focus to the top of the list, where the new page starts.
  function goToPage(page) {
    handleQueryChange({ page })
    headingRef.current?.focus()
  }

  return (
    <section className="transaction-history" aria-labelledby={headingId}>
      <h2 id={headingId} ref={headingRef} tabIndex={-1}>
        Transaction history
      </h2>

      <TransactionFilters
        query={query}
        onChange={handleQueryChange}
        onClear={clearFilters}
        rangeReversed={rangeReversed}
        searchRef={searchRef}
      />

      <p className="transaction-history__message" role="status">
        {message}
      </p>

      <ListContent
        list={list}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
        onAddFirst={onAddFirst}
        onPageChange={goToPage}
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

function LoadingNote() {
  return (
    <p className="transaction-history__note" role="status">
      Loading transactions…
    </p>
  )
}

function ListContent({ list, filtersActive, onClearFilters, onAddFirst, onPageChange, onEdit, onDelete }) {
  const { status, isRefreshing, transactions, pagination } = list

  if (status === 'idle') {
    return (
      <p className="transaction-history__note">
        The To date is before the From date. Change one of them to see your transactions.
      </p>
    )
  }

  if (status === 'loading') return <LoadingNote />

  if (status === 'error') {
    return (
      <div className="transaction-history__error">
        <ErrorAlert error={list.error} context="We couldn't load your transactions." />
        {list.error?.kind !== 'unauthorized' && (
          <button type="button" className="button button--secondary" onClick={list.reload}>
            Try again
          </button>
        )}
      </div>
    )
  }

  if (transactions.length === 0) {
    // Emptied by a delete, or a page past the end: the next page is on its way.
    if (isRefreshing || pagination.total_count > 0) return <LoadingNote />

    if (filtersActive) {
      return (
        <div className="transaction-history__empty">
          <p>No transactions match your search and filters.</p>
          <button type="button" className="button button--secondary" onClick={onClearFilters}>
            Clear all filters
          </button>
        </div>
      )
    }

    return (
      <div className="transaction-history__empty">
        <p>You haven't added any transactions yet.</p>
        {/* Secondary, so the form's Save button stays the page's one primary action. */}
        <button type="button" className="button button--secondary" onClick={onAddFirst}>
          Add your first transaction
        </button>
      </div>
    )
  }

  const first = (pagination.page - 1) * pagination.page_size + 1
  const last = first + transactions.length - 1
  const noun = pagination.total_count === 1 ? 'transaction' : 'transactions'

  return (
    <>
      <p className="transaction-history__summary" role="status">
        {pagination.total_count <= transactions.length
          ? `Showing ${pagination.total_count} ${noun}`
          : `Showing ${first} to ${last} of ${pagination.total_count} ${noun}`}
        {filtersActive && ' that match your search and filters'}.
      </p>
      <ul className={`transaction-list${isRefreshing ? ' transaction-list--refreshing' : ''}`} aria-busy={isRefreshing}>
        {transactions.map((transaction) => (
          <TransactionListItem key={transaction.id} transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </ul>
      <Pagination
        page={pagination.page}
        totalPages={pagination.total_pages}
        onPageChange={onPageChange}
        disabled={isRefreshing}
      />
    </>
  )
}
