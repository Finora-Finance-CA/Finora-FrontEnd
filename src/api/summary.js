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
