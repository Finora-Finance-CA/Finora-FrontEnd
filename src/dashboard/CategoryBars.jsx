import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCents } from '../transactions/money'
import { compactDollars } from './chartFormat'
import { CHART_TOOLTIP_STYLE } from './chartStyle'

/**
 * The bars of the dashboard's spending by category (US-43), drawn with Recharts. Its own
 * chunk, loaded only when the dashboard opens (US-62), so no other page downloads the
 * chart library. CategorySpendingChart owns the data, the states and the table.
 *
 * @param {object} props
 * @param {{ category: string, spent_cents: number }[]} props.categories
 * @param {boolean} props.compact Short figures and narrower margins for a phone (US-56).
 */
export default function CategoryBars({ categories, compact }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={categories}
        layout="vertical"
        margin={{ top: 4, right: compact ? 48 : 72, bottom: 4, left: 0 }}
        accessibilityLayer={false}
      >
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickFormatter={compactDollars} tickLine={false} axisLine={false} tickCount={compact ? 3 : 5} />
        <YAxis type="category" dataKey="category" width={compact ? 96 : 110} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ className: 'category-chart__cursor' }}
          formatter={(cents) => [formatCents(cents), 'Spent']}
          {...CHART_TOOLTIP_STYLE}
        />
        <Bar dataKey="spent_cents" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList dataKey="spent_cents" position="right" formatter={compact ? compactDollars : formatCents} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
