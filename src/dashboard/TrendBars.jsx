import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMonth } from '../summary/months'
import { formatCents } from '../transactions/money'
import { compactDollars } from './chartFormat'
import { CHART_TOOLTIP_STYLE } from './chartStyle'

/**
 * The bars of the dashboard's 6-month spending trend (US-44), drawn with Recharts. Its
 * own chunk, loaded only when the dashboard opens (US-62). SpendingTrendChart owns the
 * data, the states and the table.
 *
 * @param {object} props
 * @param {{ month: string, label: string, expense_cents: number }[]} props.data
 * @param {boolean} props.compact No figures on the bars, which would overlap on a phone (US-56).
 */
export default function TrendBars({ data, compact }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: compact ? 8 : 24, right: 8, bottom: 4, left: 0 }} accessibilityLayer={false}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
        <YAxis tickFormatter={compactDollars} tickLine={false} axisLine={false} width={compact ? 48 : 64} />
        <Tooltip
          cursor={{ className: 'trend-chart__cursor' }}
          labelFormatter={(_, payload) => (payload?.[0] ? formatMonth(payload[0].payload.month) : '')}
          formatter={(cents) => [formatCents(cents), 'Spent']}
          {...CHART_TOOLTIP_STYLE}
        />
        <Bar dataKey="expense_cents" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {!compact && <LabelList dataKey="expense_cents" position="top" formatter={compactDollars} />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
