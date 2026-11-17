// Recharts takes tooltip styles as objects; these use the design tokens, so tooltips
// follow light and dark mode like the rest of the app.
export const CHART_TOOLTIP_STYLE = Object.freeze({
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
  },
  itemStyle: { color: 'var(--text)' },
  labelStyle: { color: 'var(--text-muted)' },
})
