import { CircleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import BudgetRow from '../budgets/BudgetRow'
import { useBudgets } from '../budgets/useBudgets'
import { useBudgetStatus } from '../budgets/useBudgetStatus'
import MonthSelector from '../summary/MonthSelector'
import { formatMonth } from '../summary/months'
import { useMonthParam } from '../summary/useMonthParam'
import AddTransactionDrawer from '../transactions/AddTransactionDrawer'
import { BUDGET_CATEGORIES } from '../transactions/constants'
import './BudgetsPage.css'

/**
 * /budgets (US-32, US-33): a monthly spending limit for each expense category, all
 * managed from one page. Every category has a row, with or without a limit.
 *
 * Each limit also shows what was spent against it in the chosen month (US-36, US-37).
 * The month is in the URL (?month=2026-10), like /summary. The figures load again
 * after a limit or a transaction changes (US-38), and each row can add an expense in
 * its category.
 */
export default function BudgetsPage() {
  const { month, thisMonth, showMonth } = useMonthParam()
  const budgets = useBudgets()
  const spending = useBudgetStatus(month)
  // The category an expense is being added to, or null.
  const [addingTo, setAddingTo] = useState(null)
  // What just happened ("Expense of $12.50 saved."), shown above the list.
  const [message, setMessage] = useState('')
  const openerRef = useRef(null)

  function openAddExpense(category, opener) {
    openerRef.current = opener
    setMessage('')
    setAddingTo(category)
  }

  // Saving notifies every page (useTransactionForm), so the figures load again by
  // themselves; the row keeps its place while they do.
  function handleExpenseSaved(_transaction, text) {
    setAddingTo(null)
    setMessage(text)
  }

  return (
    <div className="page">
      <PageHeader
        title="Budgets"
        subtitle="Set a monthly spending limit for each category, and see how much of it you've spent."
        actions={<MonthSelector month={month} current={thisMonth} onChange={showMonth} />}
      />
      <BudgetsContent
        budgets={budgets}
        spending={spending}
        month={month}
        message={message}
        onAddExpense={openAddExpense}
      />
      {addingTo && (
        <AddTransactionDrawer
          initialValues={{ category: addingTo }}
          onSaved={handleExpenseSaved}
          onClose={() => setAddingTo(null)}
          returnFocusRef={openerRef}
        />
      )}
    </div>
  )
}

function BudgetsContent({ budgets, spending, month, message, onAddExpense }) {
  if (budgets.status === 'loading' || spending.status === 'loading') {
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

  if (budgets.status === 'error' || spending.status === 'error') {
    const failed = budgets.status === 'error' ? budgets : spending
    const context =
      failed === budgets ? "We couldn't load your budgets." : `We couldn't load your spending for ${formatMonth(month)}.`
    const retry = () => {
      if (budgets.status === 'error') budgets.reload()
      if (spending.status === 'error') spending.reload()
    }
    return (
      <Card>
        <EmptyState
          icon={CircleAlert}
          title="Budgets didn't load"
          action={failed.error?.kind !== 'unauthorized' && <Button onClick={retry}>Try again</Button>}
        >
          <ErrorAlert error={failed.error} context={context} />
        </EmptyState>
      </Card>
    )
  }

  const setCount = BUDGET_CATEGORIES.filter((category) => budgets.budgetsByCategory[category]).length

  // A limit that changes, or is added or removed, changes the figures too.
  function handleSaved(budget) {
    budgets.showSaved(budget)
    spending.reload()
  }
  function handleRemoved(category) {
    budgets.showRemoved(category)
    spending.reload()
  }
  function handleOutOfDate() {
    budgets.reload()
    spending.reload()
  }

  return (
    <section className="budgets" aria-label="Monthly limits">
      <div className="budgets__intro">
        <p className="budgets__count tabular">
          {setCount === 0
            ? "You haven't set any limits yet. Choose Set limit next to a category to add one."
            : `${setCount} of ${BUDGET_CATEGORIES.length} categories have a monthly limit.`}
        </p>
        {setCount > 0 && (
          <p className="budgets__note">
            Spending in {formatMonth(month)}. Limits apply to every month.
          </p>
        )}
      </div>
      <p className="budgets__message" role="status">
        {message}
      </p>
      <Card padded={false} aria-busy={spending.isRefreshing}>
        <ul className="budget-list">
          {BUDGET_CATEGORIES.map((category) => (
            <BudgetRow
              key={category}
              category={category}
              budget={budgets.budgetsByCategory[category]}
              spending={spending.statusByCategory[category]}
              onSaved={handleSaved}
              onRemoved={handleRemoved}
              onOutOfDate={handleOutOfDate}
              onAddExpense={onAddExpense}
            />
          ))}
        </ul>
      </Card>
    </section>
  )
}
