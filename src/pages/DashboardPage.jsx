import { CircleAlert } from 'lucide-react'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import MonthSelector from '../summary/MonthSelector'
import { formatMonth } from '../summary/months'
import SummaryCards, { SummaryCardsSkeleton } from '../summary/SummaryCards'
import { useMonthlySummary } from '../summary/useMonthlySummary'
import { useMonthParam } from '../summary/useMonthParam'
import './DashboardPage.css'
import BudgetAlertsPanel from '../dashboard/BudgetAlertsPanel'

/**
 * /dashboard (US-42): the key numbers for one month in one place. The month is in the
 * URL (?month=2026-11), like /summary and /budgets, and every panel shows that same
 * month: the summary cards, budget alerts (US-41) and spending charts (US-43, US-44).
 */
export default function DashboardPage() {
  const { month, thisMonth, showMonth } = useMonthParam()
  const summary = useMonthlySummary(month)

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle="Your month at a glance."
        actions={<MonthSelector month={month} current={thisMonth} onChange={showMonth} />}
      />

      <div className="dashboard">
        <section className="dashboard__summary" aria-label="Monthly summary">
          <DashboardSummary summary={summary} month={month} />
        </section>

        <section className="dashboard__panel" aria-labelledby="dashboard-alerts">
        <h2 id="dashboard-alerts" className="dashboard__heading">Budget alerts</h2>
        <BudgetAlertsPanel month={month} />
        </section>

        <section className="dashboard__panel" aria-labelledby="dashboard-categories">
          <h2 id="dashboard-categories" className="dashboard__heading">Spending by category</h2>
          <Card>
            <p className="dashboard__placeholder">Coming soon (US-43).</p>
          </Card>
        </section>

        <section className="dashboard__panel dashboard__panel--wide" aria-labelledby="dashboard-trend">
          <h2 id="dashboard-trend" className="dashboard__heading">Spending over the last 6 months</h2>
          <Card>
            <p className="dashboard__placeholder">Coming soon (US-44).</p>
          </Card>
        </section>
      </div>
    </div>
  )
}

// The same three cards as /summary (US-29), with their loading and error states.
function DashboardSummary({ summary, month }) {
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

  return <SummaryCards summary={summary.summary} isRefreshing={summary.isRefreshing} />
}
