import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import AddTransactionDrawer from '../transactions/AddTransactionDrawer'
import { hasActiveFilters, isRangeReversed, readListQuery, writeListQuery } from '../transactions/listQuery'
import TransactionHistory from '../transactions/TransactionHistory'
import { useTransactions } from '../transactions/useTransactions'
import './TransactionsPage.css'

export default function TransactionsPage() {
  const [adding, setAdding] = useState(false)
  // What just happened ("Expense of $12.50 saved."), shown above the table.
  const [message, setMessage] = useState('')
  const addButtonRef = useRef(null)

  // The list's page, search and filters live in the URL, so refresh and Back keep them.
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => readListQuery(searchParams), [searchParams])
  const rangeReversed = isRangeReversed(query)
  const list = useTransactions(query, { enabled: !rangeReversed })

  // Any change to the search or filters starts again from page 1, unless it says
  // which page to show. The search box replaces the history entry, so Back doesn't
  // step through every word typed.
  const updateQuery = useCallback(
    (changes, { replace = false } = {}) => {
      setSearchParams((current) => writeListQuery({ ...readListQuery(current), page: 1, ...changes }), { replace })
    },
    [setSearchParams]
  )

  // A page past the end, e.g. after deleting the only transaction on the last page:
  // show the last page that has transactions instead.
  const { status, isRefreshing, transactions, pagination } = list
  const pageIsPastEnd =
    status === 'loaded' &&
    !isRefreshing &&
    transactions.length === 0 &&
    query.page > 1 &&
    query.page > pagination.total_pages
  useEffect(() => {
    if (pageIsPastEnd) updateQuery({ page: Math.max(pagination.total_pages, 1) }, { replace: true })
  }, [pageIsPastEnd, pagination.total_pages, updateQuery])

  function openAdd() {
    setMessage('')
    setAdding(true)
  }

  // The drawer closes and focus goes back to Add transaction; the list loads again so
  // the new transaction shows where the API puts it.
  function handleAdded(_transaction, text) {
    setAdding(false)
    setMessage(text)
    list.reload()
  }

  return (
    <div className="page">
      <PageHeader
        title="Transactions"
        subtitle="Every income and expense, newest first."
        actions={
          <Button ref={addButtonRef} variant="primary" icon={Plus} aria-haspopup="dialog" onClick={openAdd}>
            <span>
              Add <span className="transactions-page__add-noun">transaction</span>
            </span>
          </Button>
        }
      />
      <TransactionHistory
        list={list}
        query={query}
        filtersActive={hasActiveFilters(query)}
        rangeReversed={rangeReversed}
        onQueryChange={updateQuery}
        onAddFirst={openAdd}
        message={message}
        onMessage={setMessage}
      />
      {adding && <AddTransactionDrawer onSaved={handleAdded} onClose={() => setAdding(false)} returnFocusRef={addButtonRef} />}
    </div>
  )
}
