import { lazy, Suspense, useEffect } from 'react'
import { Link } from 'react-router'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import Panel from '../components/ui/Panel'
import Skeleton from '../components/ui/Skeleton'
import { formatMonth } from '../summary/months'
import { formatCents } from '../transactions/money'
import { useSpendingTrend } from './useChartData'
import { isCompactWidth, useContainerWidth } from './useContainerWidth'
import './SpendingTrendChart.css'

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "Jun" under each bar, with the year on the first bar and on January, so a range that
// crosses a new year is clear. When the chart is narrow, the month only, so all six fit
// without overlapping (the tooltip and the table give the full month). From the YYYY-MM
// text, never a Date, like months.js.
function axisMonth(month, index, compact) {
  const [year, number] = month.split('-')
  const name = MONTH_ABBREVIATIONS[Number(number) - 1]
  return !compact && (index === 0 || number === '01') ? `${name} ${year}` : name
}

// The chart itself (Recharts) is its own chunk, so only the dashboard downloads it (US-62).
const loadTrendBars = () => import('./TrendBars')
const TrendBars = lazy(loadTrendBars)

const TITLE = 'Spending over the last 6 months'

/**
 * The dashboard's spending over the last 6 months (US-44): a bar per month, ending at
 * the chosen month, with each month's total on its bar and on hover. Hidden from screen
 * readers; a visually hidden table gives them the same figures.
 */
export default function SpendingTrendChart({ month }) {
  const result = useSpendingTrend(month)
  const [chartRef, chartWidth] = useContainerWidth()
  // On a phone (US-56): month names only and narrower gaps, so all six short totals
  // ("$2.2K") fit over their bars. Tapping a bar shows the exact total.
  const compact = isCompactWidth(chartWidth)

  // Start downloading the chart's code at once, alongside the data, rather than after it.
  useEffect(() => {
    loadTrendBars().catch(() => {})
  }, [])

  if (result.status === 'loading') {
    return (
      <Panel title={TITLE}>
        <p className="visually-hidden" role="status">
          Loading spending over the last 6 months…
        </p>
        <div aria-hidden="true" className="trend-chart__skeleton">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="trend-chart__skeleton-bar" />
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
          title="Spending over time didn't load"
          error={result.error}
          context="We couldn't load your spending over the last 6 months."
          onRetry={result.reload}
        />
      </Panel>
    )
  }

  const { months } = result.trend
  const first = months[0]?.month

  if (months.every(({ expense_cents }) => expense_cents === 0)) {
    return (
      <Panel title={TITLE}>
        <EmptyState
          title="No expenses in the last 6 months"
          action={
            <Link to="/transactions" className="button button--secondary">
              Add an expense
            </Link>
          }
        >
          Expenses from {first ? formatMonth(first) : 'the last 6 months'} to {formatMonth(month)} will be shown here.
        </EmptyState>
      </Panel>
    )
  }

  const data = months.map((item, index) => ({ ...item, label: axisMonth(item.month, index, compact) }))

  return (
    <Panel title={TITLE} busy={result.isRefreshing}>
      <div className="trend-chart" aria-hidden="true" ref={chartRef}>
        {/* Holds the chart's space while its code arrives, so nothing jumps. */}
        <Suspense fallback={<div className="trend-chart__placeholder" />}>
          <TrendBars data={data} compact={compact} />
        </Suspense>
      </div>

      {/* In a hidden box rather than a hidden table: a table ignores width: 1px and
          would widen the page on a phone. */}
      <div className="visually-hidden">
        <table>
          <caption>
            Spending from {first ? formatMonth(first) : ''} to {formatMonth(month)}
          </caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Spent</th>
            </tr>
          </thead>
          <tbody>
            {months.map(({ month: itemMonth, expense_cents }) => (
              <tr key={itemMonth}>
                <th scope="row">{formatMonth(itemMonth)}</th>
                <td>{formatCents(expense_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
