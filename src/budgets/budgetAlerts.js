// How each budget status from the API (US-35) is shown: the progress bar's tone and a
// status word (US-39, US-40). The API decides the status; this only decides its look,
// so the Budgets page and the dashboard alerts (US-41) always agree.

import { formatCents } from '../transactions/money'

const TONES = { under: 'default', warning: 'warning', over: 'danger' }

/**
 * @param {'under'|'warning'|'over'} status From the budget status endpoint.
 * @param {number} [remainingCents] What's left of the limit, negative when over. An
 *   over budget's word says by how much ("Over by $23.15").
 * @returns {{ tone: 'default'|'warning'|'danger', label: string|null }}
 *   "On track", "Close to limit" or "Over by $X". An unknown status is shown like
 *   under, with no word, since nothing is known about it.
 */
export function budgetAlert(status, remainingCents) {
  if (status === 'under') return { tone: 'default', label: 'On track' }
  if (status === 'warning') return { tone: 'warning', label: 'Close to limit' }
  if (status === 'over') {
    const label = Number.isInteger(remainingCents) && remainingCents < 0 ? remainingText(remainingCents) : 'Over budget'
    return { tone: TONES.over, label }
  }
  return { tone: 'default', label: null }
}
/** "$95.13 left", or "Over by $23.15" when the limit has been passed (US-37). */
export function remainingText(remainingCents) {
  return remainingCents < 0 ? `Over by ${formatCents(-remainingCents)}` : `${formatCents(remainingCents)} left`
}

/**
 * The budgets that need attention (warning or over), the fullest first (US-41). Ranked
 * by spent / limit rather than the rounded percent, so "over by a cent" comes before
 * "exactly full". The ratios are compared by cross-multiplying in BigInt, never by
 * dividing, so two budgets that differ by less than a floating-point step still sort
 * the right way.
 *
 * @param {import('../api/budgets').BudgetStatus[]} budgets
 * @returns {import('../api/budgets').BudgetStatus[]}
 */
export function budgetsNeedingAttention(budgets) {
  const usage = (budget) => ({ spent: BigInt(budget.spent_cents), limit: BigInt(budget.limit_cents) })
  return budgets
    .filter((budget) => budget.status !== 'under')
    .sort((a, b) => {
      const x = usage(a)
      const y = usage(b)
      // b's ratio minus a's, with both sides multiplied by the two (positive) limits.
      const difference = y.spent * x.limit - x.spent * y.limit
      return difference > 0n ? 1 : difference < 0n ? -1 : 0
    })
}
