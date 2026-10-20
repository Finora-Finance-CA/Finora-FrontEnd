import ErrorAlert from '../components/ErrorAlert'
import BudgetRow from '../budgets/BudgetRow'
import { useBudgets } from '../budgets/useBudgets'
import { BUDGET_CATEGORIES } from '../transactions/constants'
import '../components/buttons.css'

/**
 * /budgets (US-32, US-33): a monthly spending limit for each expense category, all
 * managed from one page. Every category has a row, with or without a limit.
 */
export default function BudgetsPage() {
  const budgets = useBudgets()

  return (
    <main id="main" className="page budgets-page">
      <h1>Budgets</h1>
      <p className="page__intro">Set a monthly spending limit for each category. You can change or remove a limit at any time.</p>
      <BudgetsContent budgets={budgets} />
    </main>
  )
}

function BudgetsContent({ budgets }) {
  if (budgets.status === 'loading') {
    return <p role="status">Loading budgets…</p>
  }

  if (budgets.status === 'error') {
    return (
      <div className="budgets-page__error">
        <ErrorAlert error={budgets.error} context="We couldn't load your budgets." />
        {budgets.error?.kind !== 'unauthorized' && (
          <button type="button" className="button button--secondary" onClick={budgets.reload}>
            Try again
          </button>
        )}
      </div>
    )
  }

  const setCount = BUDGET_CATEGORIES.filter((category) => budgets.budgetsByCategory[category]).length

  return (
    <>
      <p className="budgets-page__count">
        {setCount === 0
          ? "You haven't set any limits yet. Choose Set limit next to a category to add one."
          : `${setCount} of ${BUDGET_CATEGORIES.length} categories have a monthly limit.`}
      </p>
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
    </>
  )
}
