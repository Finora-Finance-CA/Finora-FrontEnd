import ErrorState from '../components/ErrorState'
import PageHeader from '../components/ui/PageHeader'
import MonthSelector from '../summary/MonthSelector'
import { formatMonth } from '../summary/months'
import SummaryCards, { SummaryCardsSkeleton } from '../summary/SummaryCards'
import { useMonthlySummary } from '../summary/useMonthlySummary'
import { useMonthParam } from '../summary/useMonthParam'
import BudgetAlertsPanel from '../dashboard/BudgetAlertsPanel'
import CategorySpendingChart from '../dashboard/CategorySpendingChart'
import SpendingTrendChart from '../dashboard/SpendingTrendChart'
import './DashboardPage.css'

/**
 * /dashboard (US-42): one month, answering "how much is left, and where did it go?".
 * The month is in the URL (?month=2026-11), like /summary and /budgets, and every part
 * shows that same month.
 *
 * It leads with one large figure: what's left of the month's income after expenses (the
 * API's net balance, the same figure /summary shows). Under it, the budgets that need
 * attention (US-41), then spending by category (US-43) and over the last 6 months (US-44).
 */
export default function DashboardPage() {
  const { month, thisMonth, showMonth } = useMonthParam()
  const summary = useMonthlySummary(month)
  const leadLabel = month === thisMonth ? 'Left this month' : `Left in ${formatMonth(month)}`

  return (
    <div className="page">
      <PageHeader title="Dashboard" actions={<MonthSelector month={month} current={thisMonth} onChange={showMonth} />} />

      <section className="dashboard__lead" aria-label="Monthly summary">
        <DashboardSummary summary={summary} month={month} leadLabel={leadLabel} />
      </section>

      <div className="dashboard">
        <BudgetAlertsPanel month={month} />
        <CategorySpendingChart month={month} />
        <div className="dashboard__wide">
          <SpendingTrendChart month={month} />
        </div>
      </div>
    </div>
  )
}

// The month's figures (US-29) as the lead, with their loading and error states.
function DashboardSummary({ summary, month, leadLabel }) {
  if (summary.status === 'loading') {
    return (
      <>
        <p className="visually-hidden" role="status">
          Loading summary…
        </p>
        <SummaryCardsSkeleton variant="lead" />
      </>
    )
  }

  if (summary.status === 'error') {
    return (
      <ErrorState
        title="The summary didn't load"
        error={summary.error}
        context={`We couldn't load the summary for ${formatMonth(month)}.`}
        onRetry={summary.reload}
      />
    )
  }

  return <SummaryCards variant="lead" leadLabel={leadLabel} summary={summary.summary} isRefreshing={summary.isRefreshing} />
}
