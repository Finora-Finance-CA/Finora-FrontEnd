import { Link } from 'react-router'
import { budgetAlert, budgetsNeedingAttention, remainingText } from '../budgets/budgetAlerts'
import { useBudgetStatus } from '../budgets/useBudgetStatus'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import Panel from '../components/ui/Panel'
import ProgressBar from '../components/ui/ProgressBar'
import Skeleton from '../components/ui/Skeleton'
import { formatMonth } from '../summary/months'
import CategoryLabel from '../transactions/CategoryLabel'
import { formatCents } from '../transactions/money'
import './BudgetAlertsPanel.css'

const TITLE = 'Budget alerts'

/**
 * The dashboard's budget alerts (US-41): every category at 80% or more of its limit in
 * the chosen month, sorted by percent used, as rows: category, spent of limit, a thin
 * bar and a status word ("Close to limit", "Over by $23.15"). Uses the same figures and
 * words as the Budgets page (US-39, US-40), and refreshes when transactions change
 * (US-38).
 */
export default function BudgetAlertsPanel({ month }) {
  const spending = useBudgetStatus(month)

  if (spending.status === 'loading') {
    return (
      <Panel title={TITLE}>
        <p className="visually-hidden" role="status">
          Loading budget alerts…
        </p>
        <ul className="budget-alerts" aria-hidden="true">
          {[0, 1].map((index) => (
            <li key={index} className="budget-alerts__item">
              <div className="budget-alerts__top">
                <Skeleton shape="short" />
                <Skeleton shape="amount" />
              </div>
              <Skeleton shape="bar" />
              <Skeleton shape="short" />
            </li>
          ))}
        </ul>
      </Panel>
    )
  }

  if (spending.status === 'error') {
    return (
      <Panel title={TITLE}>
        <ErrorState
          bare
          title="Budget alerts didn't load"
          error={spending.error}
          context={`We couldn't load your budgets for ${formatMonth(month)}.`}
          onRetry={spending.reload}
        />
      </Panel>
    )
  }

  if (spending.budgets.length === 0) {
    return (
      <Panel title={TITLE}>
        <EmptyState
          title="No budgets yet"
          action={
            <Link to="/budgets" className="button button--secondary">
              Set a limit
            </Link>
          }
        >
          Set monthly limits to get alerts when spending gets close.
        </EmptyState>
      </Panel>
    )
  }

  const alerts = budgetsNeedingAttention(spending.budgets)
  const manage = <Link to={`/budgets?month=${month}`}>Manage budgets</Link>

  if (alerts.length === 0) {
    return (
      <Panel title={TITLE} action={manage}>
        <EmptyState title="All budgets on track">
          No category has reached 80% of its limit in {formatMonth(month)}.
        </EmptyState>
      </Panel>
    )
  }

  return (
    <Panel title={TITLE} action={manage} busy={spending.isRefreshing}>
      <ul className="budget-alerts">
        {alerts.map((budget) => {
          const alert = budgetAlert(budget.status, budget.remaining_cents)
          const left = remainingText(budget.remaining_cents)
          const over = budget.remaining_cents < 0
          return (
            <li key={budget.category} className="budget-alerts__item">
              <div className="budget-alerts__top">
                <span className="budget-alerts__category">
                  <CategoryLabel category={budget.category} />
                </span>
                <span className="budget-alerts__figures">
                  {formatCents(budget.spent_cents)} <span className="budget-alerts__of">of {formatCents(budget.limit_cents)}</span>
                </span>
              </div>
              <ProgressBar
                value={budget.percent_used}
                label={`${budget.category} spending`}
                valueText={`${budget.percent_used}% used, ${left}`}
                tone={alert.tone}
              />
              <p className="budget-alerts__bottom">
                <span className={`status-word status-word--${alert.tone}`}>{alert.label}</span>
                <span>{over ? `${budget.percent_used}% used` : `${budget.percent_used}% used, ${left}`}</span>
              </p>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
