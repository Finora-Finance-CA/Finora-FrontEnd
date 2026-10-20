import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { hasActiveFilters, isRangeReversed, readListQuery, writeListQuery } from '../transactions/listQuery'
import TransactionForm from '../transactions/TransactionForm'
import TransactionHistory from '../transactions/TransactionHistory'
import { useTransactions } from '../transactions/useTransactions'
import './TransactionsPage.css'

export default function TransactionsPage() {
  // Expense or income. Expense comes first because it's the more common entry.
  const [transactionType, setTransactionType] = useState('expense')
  const amountRef = useRef(null)

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

  return (
    <main className="transactions-page">
      <h1>Transactions</h1>
      <TransactionForm
        type={transactionType}
        onTypeChange={setTransactionType}
        onSaved={list.reload}
        firstFieldRef={amountRef}
      />
      <TransactionHistory
        list={list}
        query={query}
        filtersActive={hasActiveFilters(query)}
        rangeReversed={rangeReversed}
        onQueryChange={updateQuery}
        onAddFirst={() => amountRef.current?.focus()}
      />
    </main>
  )
}
