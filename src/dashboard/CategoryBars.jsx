import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCents } from '../transactions/money'
import { compactDollars } from './chartFormat'
import { CHART_TOOLTIP_STYLE } from './chartStyle'

/**
 * The bars of the dashboard's spending by category (US-43), drawn with Recharts. Its own
 * chunk, loaded only when the dashboard opens (US-62), so no other page downloads the
 * chart library. CategorySpendingChart owns the data, the states and the table.
 *
 * One colour, and each bar labelled with its amount, so there's no value axis, grid or
 * legend to read across.
 *
 * @param {object} props
 * @param {{ category: string, spent_cents: number }[]} props.categories
 * @param {boolean} props.compact Narrower margins for a phone (US-56).
 * @param {boolean} [props.shortLabels] Short figures ("$1.8K") where even exact ones won't fit.
 */
export default function CategoryBars({ categories, compact, shortLabels = compact }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={categories}
        layout="vertical"
        margin={{ top: 4, right: shortLabels ? 56 : 84, bottom: 4, left: 0 }}
        barCategoryGap="28%"
        accessibilityLayer={false}
      >
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="category" width={compact ? 112 : 128} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ className: 'category-chart__cursor' }}
          formatter={(cents) => [formatCents(cents), 'Spent']}
          {...CHART_TOOLTIP_STYLE}
        />
        <Bar dataKey="spent_cents" radius={[0, 2, 2, 0]} isAnimationActive={false}>
          <LabelList dataKey="spent_cents" position="right" formatter={shortLabels ? compactDollars : formatCents} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
