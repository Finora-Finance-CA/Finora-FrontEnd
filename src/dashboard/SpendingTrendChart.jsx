import { TrendingUp } from 'lucide-react'
import { lazy, Suspense, useEffect } from 'react'
import { Link } from 'react-router'
import ErrorState from '../components/ErrorState'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
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

/**
 * The dashboard's spending over the last 6 months (US-44): a bar per month, ending at
 * the chosen month, with each month's total on its bar and on hover. Hidden from screen
 * readers; a visually hidden table gives them the same figures.
 */
export default function SpendingTrendChart({ month }) {
  const result = useSpendingTrend(month)
  const [chartRef, chartWidth] = useContainerWidth()
  // On a phone (US-56): month names only, every one shown, and no figure on top of each
  // bar, where six of them would run into each other. Tapping a bar shows its total.
  const compact = isCompactWidth(chartWidth)

  // Start downloading the chart's code at once, alongside the data, rather than after it.
  useEffect(() => {
    loadTrendBars().catch(() => {})
  }, [])

  if (result.status === 'loading') {
    return (
      <Card>
        <p className="visually-hidden" role="status">
          Loading spending over the last 6 months…
        </p>
        <div aria-hidden="true" className="trend-chart__skeleton">
          <Skeleton shape="text" />
          <Skeleton shape="text" />
        </div>
      </Card>
    )
  }

  if (result.status === 'error') {
    return (
      <ErrorState
        title="Spending over time didn't load"
        error={result.error}
        context="We couldn't load your spending over the last 6 months."
        onRetry={result.reload}
      />
    )
  }

  const { months } = result.trend
  const first = months[0]?.month

  if (months.every(({ expense_cents }) => expense_cents === 0)) {
    return (
      <Card>
        <EmptyState
          icon={TrendingUp}
          title="No expenses in the last 6 months"
          action={
            <Link to="/transactions" className="button button--secondary">
              Add an expense
            </Link>
          }
        >
          Expenses from {first ? formatMonth(first) : 'the last 6 months'} to {formatMonth(month)} will be shown here.
        </EmptyState>
      </Card>
    )
  }

  const data = months.map((item, index) => ({ ...item, label: axisMonth(item.month, index, compact) }))

  return (
    <Card aria-busy={result.isRefreshing}>
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
    </Card>
  )
}
