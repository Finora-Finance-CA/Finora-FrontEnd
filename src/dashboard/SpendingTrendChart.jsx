import { CircleAlert, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import { formatMonth } from '../summary/months'
import { formatCents } from '../transactions/money'
import { useSpendingTrend } from './useChartData'
import './SpendingTrendChart.css'

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "Jun" under each bar, with the year on the first bar and on January, so a range that
// crosses a new year is clear. From the YYYY-MM text, never a Date, like months.js.
function axisMonth(month, index) {
  const [year, number] = month.split('-')
  const name = MONTH_ABBREVIATIONS[Number(number) - 1]
  return index === 0 || number === '01' ? `${name} ${year}` : name
}

const compactDollars = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const axisDollars = (cents) => compactDollars.format(cents / 100)

/**
 * The dashboard's spending over the last 6 months (US-44): a bar per month, ending at
 * the chosen month, with each month's total on its bar and on hover. Hidden from screen
 * readers; a visually hidden table gives them the same figures.
 */
export default function SpendingTrendChart({ month }) {
  const result = useSpendingTrend(month)

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
      <Card>
        <EmptyState
          icon={CircleAlert}
          title="Spending over time didn't load"
          action={result.error?.kind !== 'unauthorized' && <Button onClick={result.reload}>Try again</Button>}
        >
          <ErrorAlert error={result.error} context="We couldn't load your spending over the last 6 months." />
        </EmptyState>
      </Card>
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

  const data = months.map((item, index) => ({ ...item, label: axisMonth(item.month, index) }))

  return (
    <Card aria-busy={result.isRefreshing}>
      <div className="trend-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 24, right: 8, bottom: 4, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={axisDollars} tickLine={false} axisLine={false} width={64} />
            <Tooltip
              cursor={{ className: 'trend-chart__cursor' }}
              labelFormatter={(_, payload) => (payload?.[0] ? formatMonth(payload[0].payload.month) : '')}
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
            <Bar dataKey="expense_cents" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="expense_cents" position="top" formatter={axisDollars} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="visually-hidden">
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
    </Card>
  )
}
