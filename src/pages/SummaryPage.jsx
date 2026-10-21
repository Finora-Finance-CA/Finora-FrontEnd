import { CalendarX, CircleAlert } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import MonthSelector from '../summary/MonthSelector'
import { currentMonth, formatMonth, isValidMonth } from '../summary/months'
import SummaryCards, { SummaryCardsSkeleton } from '../summary/SummaryCards'
import { useMonthlySummary } from '../summary/useMonthlySummary'
import '../components/ui/Button.css'
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
    <div className="page">
      <PageHeader
        title="Monthly summary"
        subtitle="What came in, what went out and what's left."
        actions={<MonthSelector month={month} current={thisMonth} onChange={showMonth} />}
      />
      <SummaryContent summary={summary} month={month} />
    </div>
  )
}

function SummaryContent({ summary, month }) {
  if (summary.status === 'loading') {
    return (
      <>
        <p className="visually-hidden" role="status">
          Loading summary…
        </p>
        <SummaryCardsSkeleton />
      </>
    )
  }

  if (summary.status === 'error') {
    return (
      <Card>
        <EmptyState
          icon={CircleAlert}
          title="The summary didn't load"
          action={summary.error?.kind !== 'unauthorized' && <Button onClick={summary.reload}>Try again</Button>}
        >
          <ErrorAlert error={summary.error} context={`We couldn't load the summary for ${formatMonth(month)}.`} />
        </EmptyState>
      </Card>
    )
  }

  const { transaction_count: count } = summary.summary
  return (
    <>
      <SummaryCards summary={summary.summary} isRefreshing={summary.isRefreshing} />
      {count === 0 && !summary.isRefreshing ? (
        <Card>
          <EmptyState
            icon={CalendarX}
            title={`No transactions in ${formatMonth(summary.summary.month)}.`}
            action={
              <Link to="/transactions" className="button button--secondary">
                Add a transaction
              </Link>
            }
          >
            Income and expenses you add for this month will be totalled here.
          </EmptyState>
        </Card>
      ) : (
        <p className="summary-page__note tabular">
          Based on {count} {count === 1 ? 'transaction' : 'transactions'} in {formatMonth(summary.summary.month)}.
        </p>
      )}
    </>
  )
}
