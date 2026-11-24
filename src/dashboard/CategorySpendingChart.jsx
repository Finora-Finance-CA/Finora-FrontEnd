import { lazy, Suspense, useEffect } from 'react'
import { Link } from 'react-router'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import Panel from '../components/ui/Panel'
import Skeleton from '../components/ui/Skeleton'
import { formatMonth } from '../summary/months'
import { formatCents } from '../transactions/money'
import { useCategorySpending } from './useChartData'
import { isCompactWidth, useContainerWidth } from './useContainerWidth'
import './CategorySpendingChart.css'

// The chart itself (Recharts) is its own chunk, so only the dashboard downloads it (US-62).
const loadCategoryBars = () => import('./CategoryBars')
const CategoryBars = lazy(loadCategoryBars)

const TITLE = 'Spending by category'

/**
 * The dashboard's spending by category (US-43): a bar per expense category for the
 * chosen month, with the amount on each bar and on hover. The chart is hidden from
 * screen readers; a visually hidden table gives them the same figures.
 */
export default function CategorySpendingChart({ month }) {
  const result = useCategorySpending(month)
  const [chartRef, chartWidth] = useContainerWidth()
  // On a phone (US-56): short figures ("$1.8K") and narrower margins, so the bars keep
  // room and the labels never run into each other. The exact amounts are in the tooltip
  // and the table.
  const compact = isCompactWidth(chartWidth)

  // Start downloading the chart's code at once, alongside the data, rather than after it.
  useEffect(() => {
    loadCategoryBars().catch(() => {})
  }, [])

  if (result.status === 'loading') {
    return (
      <Panel title={TITLE}>
        <p className="visually-hidden" role="status">
          Loading spending by category…
        </p>
        <div aria-hidden="true" className="category-chart__skeleton">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="category-chart__skeleton-row">
              <Skeleton shape="short" />
              <Skeleton shape="bar" />
            </div>
          ))}
        </div>
      </Panel>
    )
  }

  if (result.status === 'error') {
    return (
      <Panel title={TITLE}>
        <ErrorState
          bare
          title="Spending by category didn't load"
          error={result.error}
          context={`We couldn't load your spending for ${formatMonth(month)}.`}
          onRetry={result.reload}
        />
      </Panel>
    )
  }

  const { categories, total_cents: total } = result.spending

  if (total === 0) {
    return (
      <Panel title={TITLE}>
        <EmptyState
          title={`No expenses in ${formatMonth(month)}`}
          action={
            <Link to="/transactions" className="button button--secondary">
              Add an expense
            </Link>
          }
        >
          Expenses you add for this month will be shown here by category.
        </EmptyState>
      </Panel>
    )
  }

  return (
    <Panel title={TITLE} action={<span className="chart-total">{formatCents(total)} spent</span>} busy={result.isRefreshing}>
      <div className="category-chart" aria-hidden="true" ref={chartRef}>
        {/* Holds the chart's space while its code arrives, so nothing jumps. */}
        <Suspense fallback={<div className="category-chart__placeholder" />}>
          <CategoryBars categories={categories} compact={compact} shortLabels={chartWidth > 0 && chartWidth < 380} />
        </Suspense>
      </div>

      {/* In a hidden box rather than a hidden table: a table ignores width: 1px and
          would widen the page on a phone. */}
      <div className="visually-hidden">
        <table>
          <caption>Spending by category in {formatMonth(month)}</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Spent</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(({ category, spent_cents }) => (
              <tr key={category}>
                <th scope="row">{category}</th>
                <td>{formatCents(spent_cents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{formatCents(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  )
}
