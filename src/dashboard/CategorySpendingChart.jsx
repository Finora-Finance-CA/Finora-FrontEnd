import { CircleAlert, Receipt } from 'lucide-react'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import { formatMonth } from '../summary/months'
import { formatCents } from '../transactions/money'
import { useCategorySpending } from './useChartData'
import './CategorySpendingChart.css'

// "$1.2K" for the axis, where space is short. Display only; exact amounts use formatCents.
const compactDollars = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const axisLabel = (cents) => compactDollars.format(cents / 100)

/**
 * The dashboard's spending by category (US-43): a bar per expense category for the
 * chosen month, with the amount on each bar and on hover. The chart is hidden from
 * screen readers; a visually hidden table gives them the same figures.
 */
export default function CategorySpendingChart({ month }) {
  const result = useCategorySpending(month)

  if (result.status === 'loading') {
    return (
      <Card>
        <p className="visually-hidden" role="status">
          Loading spending by category…
        </p>
        <div aria-hidden="true" className="category-chart__skeleton">
          <Skeleton shape="text" />
          <Skeleton shape="text" />
          <Skeleton shape="text" />
        </div>
      </Card>
    )
  }

  if (result.status === 'error') {
    return (
      <Card>
        <EmptyState
          icon={CircleAlert}
          title="Spending by category didn't load"
          action={result.error?.kind !== 'unauthorized' && <Button onClick={result.reload}>Try again</Button>}
        >
          <ErrorAlert error={result.error} context={`We couldn't load your spending for ${formatMonth(month)}.`} />
        </EmptyState>
      </Card>
    )
  }

  const { categories, total_cents: total } = result.spending

  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={Receipt}
          title={`No expenses in ${formatMonth(month)}`}
          action={
            <Link to="/transactions" className="button button--secondary">
              Add an expense
            </Link>
          }
        >
          Expenses you add for this month will be shown here by category.
        </EmptyState>
      </Card>
    )
  }

  return (
    <Card aria-busy={result.isRefreshing}>
      <div className="category-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={categories}
            layout="vertical"
            margin={{ top: 4, right: 72, bottom: 4, left: 0 }}
            accessibilityLayer={false}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickFormatter={axisLabel} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="category" width={110} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ className: 'category-chart__cursor' }}
              formatter={(cents) => [formatCents(cents), 'Spent']}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
              }}
              itemStyle={{ color: 'var(--text)' }}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
            <Bar dataKey="spent_cents" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList dataKey="spent_cents" position="right" formatter={formatCents} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="visually-hidden">
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
    </Card>
  )
}
