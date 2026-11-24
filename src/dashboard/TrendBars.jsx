import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMonth } from '../summary/months'
import { formatCents } from '../transactions/money'
import { compactDollars } from './chartFormat'
import { CHART_TOOLTIP_STYLE } from './chartStyle'

/**
 * The bars of the dashboard's 6-month spending trend (US-44), drawn with Recharts. Its
 * own chunk, loaded only when the dashboard opens (US-62). SpendingTrendChart owns the
 * data, the states and the table.
 *
 * The chosen month (the last bar) is in the accent and the five before it are neutral,
 * so the eye lands on this month and compares it with the rest. Every bar carries its
 * own short total, so there's no value axis or grid.
 *
 * @param {object} props
 * @param {{ month: string, label: string, expense_cents: number }[]} props.data
 * @param {boolean} props.compact Narrower bars and margins on a phone (US-56).
 */
export default function TrendBars({ data, compact }) {
  const last = data.length - 1
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 24, right: 4, bottom: 4, left: 4 }}
        barCategoryGap={compact ? '24%' : '32%'}
        accessibilityLayer={false}
      >
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
        <YAxis hide />
        <Tooltip
          cursor={{ className: 'trend-chart__cursor' }}
          labelFormatter={(_, payload) => (payload?.[0] ? formatMonth(payload[0].payload.month) : '')}
          formatter={(cents) => [formatCents(cents), 'Spent']}
          {...CHART_TOOLTIP_STYLE}
        />
        <Bar dataKey="expense_cents" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((item, index) => (
            <Cell key={item.month} className={index === last ? 'trend-chart__bar--current' : 'trend-chart__bar'} />
          ))}
          <LabelList dataKey="expense_cents" position="top" formatter={compactDollars} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
