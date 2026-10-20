import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router'
import ErrorAlert from '../components/ErrorAlert'
import MonthSelector from '../summary/MonthSelector'
import { currentMonth, formatMonth, isValidMonth } from '../summary/months'
import SummaryCards from '../summary/SummaryCards'
import { useMonthlySummary } from '../summary/useMonthlySummary'
import '../components/buttons.css'
import './SummaryPage.css'

/**
 * /summary (US-28, US-29): one month's total income, expenses and net balance. The
 * month is in the URL (?month=2026-10), so refresh and Back keep it; without one, or
 * with an invalid one, it's the user's current month.
 */
export default function SummaryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const thisMonth = currentMonth()
  const requested = searchParams.get('month')
  const month = isValidMonth(requested) ? requested : thisMonth
  const summary = useMonthlySummary(month)

  const showMonth = useCallback(
    (next) => setSearchParams(next === thisMonth ? {} : { month: next }),
    [setSearchParams, thisMonth]
  )

  return (
    <main id="main" className="page summary-page">
      <h1>Monthly summary</h1>
      <MonthSelector month={month} current={thisMonth} onChange={showMonth} />
      <SummaryContent summary={summary} month={month} />
    </main>
  )
}

function SummaryContent({ summary, month }) {
  if (summary.status === 'loading') {
    return (
      <p className="summary-page__note" role="status">
        Loading summary…
      </p>
    )
  }

  if (summary.status === 'error') {
    return (
      <div className="summary-page__error">
        <ErrorAlert error={summary.error} context={`We couldn't load the summary for ${formatMonth(month)}.`} />
        {summary.error?.kind !== 'unauthorized' && (
          <button type="button" className="button button--secondary" onClick={summary.reload}>
            Try again
          </button>
        )}
      </div>
    )
  }

  const { transaction_count: count } = summary.summary
  return (
    <>
      <SummaryCards summary={summary.summary} isRefreshing={summary.isRefreshing} />
      {count === 0 && !summary.isRefreshing ? (
        <div className="summary-page__empty">
          <p>No transactions in {formatMonth(summary.summary.month)}.</p>
          <Link to="/transactions">Add a transaction</Link>
        </div>
      ) : (
        <p className="summary-page__note">
          Based on {count} {count === 1 ? 'transaction' : 'transactions'} in {formatMonth(summary.summary.month)}.
        </p>
      )}
    </>
  )
}
