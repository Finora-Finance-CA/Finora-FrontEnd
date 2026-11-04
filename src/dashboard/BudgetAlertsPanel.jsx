import { CircleAlert, CircleCheck, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { budgetAlert } from '../budgets/budgetAlerts'
import { useBudgetStatus } from '../budgets/useBudgetStatus'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ProgressBar from '../components/ui/ProgressBar'
import Skeleton from '../components/ui/Skeleton'
import { formatMonth } from '../summary/months'
import CategoryLabel from '../transactions/CategoryLabel'
import { formatCents } from '../transactions/money'
import './BudgetAlertsPanel.css'

// Budgets at 80% or more of their limit come first, the fullest at the top. Sorting by
// spent / limit (not the rounded percent) puts "over by a cent" above "exactly full".
function alertsFrom(statusByCategory) {
  return Object.values(statusByCategory ?? {})
    .filter((budget) => budget.status !== 'under')
    .sort((a, b) => b.spent_cents / b.limit_cents - a.spent_cents / a.limit_cents)
}

function remainingText(remainingCents) {
  return remainingCents < 0 ? `Over by ${formatCents(-remainingCents)}` : `${formatCents(remainingCents)} left`
}

/**
 * The dashboard's budget alerts (US-41): every category at 80% or more of its limit in
 * the chosen month, sorted by percent used. Uses the same figures and labels as the
 * Budgets page (US-39, US-40), and refreshes when transactions change (US-38).
 */
export default function BudgetAlertsPanel({ month }) {
  const spending = useBudgetStatus(month)

  if (spending.status === 'loading') {
    return (
      <Card>
        <p className="visually-hidden" role="status">
          Loading budget alerts…
        </p>
        <div aria-hidden="true" className="budget-alerts__skeleton">
          <Skeleton shape="short" />
          <Skeleton shape="short" />
        </div>
      </Card>
    )
  }

  if (spending.status === 'error') {
    return (
      <Card>
        <EmptyState
          icon={CircleAlert}
          title="Budget alerts didn't load"
          action={spending.error?.kind !== 'unauthorized' && <Button onClick={spending.reload}>Try again</Button>}
        >
          <ErrorAlert error={spending.error} context={`We couldn't load your budgets for ${formatMonth(month)}.`} />
        </EmptyState>
      </Card>
    )
  }

  const budgets = Object.values(spending.statusByCategory ?? {})
  const alerts = alertsFrom(spending.statusByCategory)

  if (budgets.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Wallet}
          title="No budgets yet"
          action={
            <Link to="/budgets" className="button button--secondary">
              Set a limit
            </Link>
          }
        >
          Set monthly limits to get alerts when spending gets close.
        </EmptyState>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <EmptyState icon={CircleCheck} title="All budgets on track">
          No category has reached 80% of its limit in {formatMonth(month)}.
        </EmptyState>
      </Card>
    )
  }

  return (
    <Card padded={false} aria-busy={spending.isRefreshing}>
      <ul className="budget-alerts">
        {alerts.map((budget) => {
          const alert = budgetAlert(budget.status)
          const left = remainingText(budget.remaining_cents)
          return (
            <li key={budget.category} className="budget-alerts__item">
              <div className="budget-alerts__top">
                <CategoryLabel category={budget.category} />
                <span className={`budget-alerts__label budget-alerts__label--${alert.tone}`}>{alert.label}</span>
                <span className="budget-alerts__figures tabular">
                  {formatCents(budget.spent_cents)} of {formatCents(budget.limit_cents)}
                </span>
              </div>
              <ProgressBar
                value={budget.percent_used}
                label={`${budget.category} spending`}
                valueText={`${budget.percent_used}% used, ${left}`}
                tone={alert.tone}
              />
              <p className="budget-alerts__bottom tabular">
                <span>{budget.percent_used}% used</span>
                <span>{left}</span>
              </p>
            </li>
          )
        })}
      </ul>
      <p className="budget-alerts__footer">
        <Link to={`/budgets?month=${month}`}>Manage budgets</Link>
      </p>
    </Card>
  )
}