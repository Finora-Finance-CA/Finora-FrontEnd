import { CircleAlert } from 'lucide-react'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import BudgetRow from '../budgets/BudgetRow'
import { useBudgets } from '../budgets/useBudgets'
import { BUDGET_CATEGORIES } from '../transactions/constants'
import './BudgetsPage.css'

/**
 * /budgets (US-32, US-33): a monthly spending limit for each expense category, all
 * managed from one page. Every category has a row, with or without a limit.
 */
export default function BudgetsPage() {
  const budgets = useBudgets()

  return (
    <div className="page">
      <PageHeader
        title="Budgets"
        subtitle="Set a monthly spending limit for each category. You can change or remove a limit at any time."
      />
      <BudgetsContent budgets={budgets} />
    </div>
  )
}

function BudgetsContent({ budgets }) {
  if (budgets.status === 'loading') {
    return (
      <>
        <p className="visually-hidden" role="status">
          Loading budgets…
        </p>
        <Card padded={false} aria-hidden="true">
          <ul className="budget-list">
            {BUDGET_CATEGORIES.map((category) => (
              <li key={category} className="budget-row">
                <div className="budget-row__summary">
                  <Skeleton shape="pill" />
                  <Skeleton shape="short" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </>
    )
  }

  if (budgets.status === 'error') {
    return (
      <Card>
        <EmptyState
          icon={CircleAlert}
          title="Budgets didn't load"
          action={budgets.error?.kind !== 'unauthorized' && <Button onClick={budgets.reload}>Try again</Button>}
        >
          <ErrorAlert error={budgets.error} context="We couldn't load your budgets." />
        </EmptyState>
      </Card>
    )
  }

  const setCount = BUDGET_CATEGORIES.filter((category) => budgets.budgetsByCategory[category]).length

  return (
    <section className="budgets" aria-label="Monthly limits">
      <p className="budgets__count tabular">
        {setCount === 0
          ? "You haven't set any limits yet. Choose Set limit next to a category to add one."
          : `${setCount} of ${BUDGET_CATEGORIES.length} categories have a monthly limit.`}
      </p>
      <Card padded={false}>
        <ul className="budget-list">
          {BUDGET_CATEGORIES.map((category) => (
            <BudgetRow
              key={category}
              category={category}
              budget={budgets.budgetsByCategory[category]}
              onSaved={budgets.showSaved}
              onRemoved={budgets.showRemoved}
              onOutOfDate={budgets.reload}
            />
          ))}
        </ul>
      </Card>
    </section>
  )
}
