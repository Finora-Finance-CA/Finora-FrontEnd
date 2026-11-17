// Formatting shared by the dashboard charts.

const compactFormat = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * Integer cents as short dollars for axes and labels where space is short, e.g. 180000 →
 * "$1.8K". Display only: exact amounts always use formatCents.
 */
export function compactDollars(cents) {
  return compactFormat.format(cents / 100)
}
