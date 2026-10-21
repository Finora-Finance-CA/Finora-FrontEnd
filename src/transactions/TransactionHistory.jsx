import { CalendarX, CircleAlert, Inbox, Plus, SearchX } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import DeleteTransactionDialog from './DeleteTransactionDialog'
import EditTransactionDialog from './EditTransactionDialog'
import Pagination from './Pagination'
import TransactionFilters from './TransactionFilters'
import TransactionTable from './TransactionTable'
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
 * @param {() => void} props.onAddFirst Opens the add drawer.
 * @param {string} props.message What just happened, e.g. "Transaction deleted.".
 * @param {(message: string) => void} props.onMessage Replaces the message ('' clears it).
 */
export default function TransactionHistory({
  list,
  query,
  filtersActive,
  rangeReversed,
  onQueryChange,
  onAddFirst,
  message,
  onMessage,
}) {
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  // The ⋯ button that opened the dialog gets focus back when it closes; the heading
  // does if that button's row has gone.
  const openerRef = useRef(null)
  const headingRef = useRef(null)
  const searchRef = useRef(null)
  const headingId = useId()

  function openDialog(open, transaction, opener) {
    openerRef.current = opener
    onMessage('')
    open(transaction)
  }

  function handleSaved(transaction) {
    list.showSaved(transaction)
    setEditing(null)
    onMessage(MESSAGES.updated)
  }

  function handleDeleted(transaction) {
    list.showRemoved(transaction.id)
    setDeleting(null)
    onMessage(MESSAGES.deleted)
  }

  function handleGone(transaction, text) {
    list.showRemoved(transaction.id)
    setEditing(null)
    setDeleting(null)
    onMessage(text)
  }

  function handleQueryChange(changes, options) {
    onMessage('')
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

      <Card padded={false}>
        <div className="transaction-history__header">
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="transaction-history__title">
            Transaction history
          </h2>
        </div>
        <ListContent
          list={list}
          headingId={headingId}
          filtersActive={filtersActive}
          onClearFilters={clearFilters}
          onAddFirst={onAddFirst}
          onPageChange={goToPage}
          onEdit={(transaction, opener) => openDialog(setEditing, transaction, opener)}
          onDelete={(transaction, opener) => openDialog(setDeleting, transaction, opener)}
        />
      </Card>

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

// Placeholder rows, with the words for screen readers.
function Loading({ headingId }) {
  return (
    <>
      <p className="visually-hidden" role="status">
        Loading transactions…
      </p>
      <TransactionTable labelledBy={headingId} loading />
    </>
  )
}

function ListContent({ list, headingId, filtersActive, onClearFilters, onAddFirst, onPageChange, onEdit, onDelete }) {
  const { status, isRefreshing, transactions, pagination } = list

  if (status === 'idle') {
    return (
      <EmptyState icon={CalendarX} title="Check the date range">
        The To date is before the From date. Change one of them to see your transactions.
      </EmptyState>
    )
  }

  if (status === 'loading') return <Loading headingId={headingId} />

  if (status === 'error') {
    return (
      <EmptyState
        icon={CircleAlert}
        title="Transactions didn't load"
        action={
          list.error?.kind !== 'unauthorized' && (
            <Button onClick={list.reload}>Try again</Button>
          )
        }
      >
        <ErrorAlert error={list.error} context="We couldn't load your transactions." />
      </EmptyState>
    )
  }

  if (transactions.length === 0) {
    // Emptied by a delete, or a page past the end: the next page is on its way.
    if (isRefreshing || pagination.total_count > 0) return <Loading headingId={headingId} />

    if (filtersActive) {
      return (
        <EmptyState
          icon={SearchX}
          title="No transactions match your search and filters."
          action={<Button onClick={onClearFilters}>Clear all filters</Button>}
        >
          Try a different search, or clear the filters to see everything.
        </EmptyState>
      )
    }

    return (
      <EmptyState
        icon={Inbox}
        title="You haven't added any transactions yet."
        action={
          // Secondary, so the page's Add transaction button stays its one primary action.
          <Button icon={Plus} onClick={onAddFirst}>
            Add your first transaction
          </Button>
        }
      >
        Add an expense or an income and it will show up here.
      </EmptyState>
    )
  }

  const first = (pagination.page - 1) * pagination.page_size + 1
  const last = first + transactions.length - 1
  const noun = pagination.total_count === 1 ? 'transaction' : 'transactions'

  return (
    <>
      <TransactionTable
        labelledBy={headingId}
        transactions={transactions}
        isRefreshing={isRefreshing}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <div className="transaction-history__footer">
        <p className="transaction-history__summary tabular" role="status">
          {pagination.total_count <= transactions.length
            ? `Showing ${pagination.total_count} ${noun}`
            : `Showing ${first} to ${last} of ${pagination.total_count} ${noun}`}
          {filtersActive && ' that match your search and filters'}.
        </p>
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          onPageChange={onPageChange}
          disabled={isRefreshing}
        />
      </div>
    </>
  )
}
