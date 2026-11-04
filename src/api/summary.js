import { apiRequest } from './client'

/**
 * @typedef {object} MonthlySummary
 * @property {string} month YYYY-MM
 * @property {number} income_cents
 * @property {number} expense_cents
 * @property {number} net_cents Income minus expenses; negative when more was spent.
 * @property {number} transaction_count
 */

/**
 * The signed-in user's totals for one month (GET /api/summary).
 *
 * @param {string} month YYYY-MM, in the user's own calendar.
 * @returns {Promise<MonthlySummary>}
 * @throws {import('./client').ApiError}
 */
export async function getMonthlySummary(month) {
  return apiRequest(`/api/summary?month=${encodeURIComponent(month)}`)
}

/**
 * What was spent in each expense category in one month (US-43), every category
 * included, 0 where nothing was spent.
 *
 * @param {string} month YYYY-MM
 * @returns {Promise<{ month: string, total_cents: number, categories: { category: string, spent_cents: number }[] }>}
 */
export function getCategorySpending(month) {
  return apiRequest(`/api/summary/categories?${new URLSearchParams({ month })}`)
}

/**
 * Total expenses for each of the `months` months ending at `month`, oldest first (US-44),
 * 0 for a month with none.
 *
 * @param {string} month YYYY-MM, the last month shown.
 * @param {number} [months] How many months, 1 to 24. Defaults to 6.
 * @returns {Promise<{ month: string, months: { month: string, expense_cents: number }[] }>}
 */
export function getSpendingTrend(month, months = 6) {
  return apiRequest(`/api/summary/trend?${new URLSearchParams({ month, months: String(months) })}`)
}
