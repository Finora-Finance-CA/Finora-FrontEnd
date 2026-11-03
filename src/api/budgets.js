import { apiRequest } from './client'

/**
 * A monthly spending limit for one category, as the API returns it.
 *
 * @typedef {object} Budget
 * @property {string} id
 * @property {string} category
 * @property {number} limit_cents
 */

function budgetPath(id) {
  return `/api/budgets/${encodeURIComponent(id)}`
}

/**
 * The signed-in user's budgets, in category order.
 *
 * @returns {Promise<Budget[]>}
 * @throws {import('./client').ApiError}
 */
export async function listBudgets() {
  const data = await apiRequest('/api/budgets')
  return data?.budgets ?? []
}

/**
 * Adds a budget. Fails with kind 'conflict' if the user already has one for that
 * category, with the API's message.
 *
 * @param {{ category: string, limit_cents: number }} payload
 * @returns {Promise<Budget>}
 * @throws {import('./client').ApiError}
 */
export async function createBudget(payload) {
  const data = await apiRequest('/api/budgets', { method: 'POST', body: payload })
  return data?.budget
}

/**
 * Changes a budget's limit. Its category can't change.
 *
 * @param {string} id
 * @param {{ limit_cents: number }} payload
 * @returns {Promise<Budget>}
 * @throws {import('./client').ApiError} With kind 'not_found' if it no longer exists.
 */
export async function updateBudget(id, payload) {
  const data = await apiRequest(budgetPath(id), { method: 'PUT', body: payload })
  return data?.budget
}

/**
 * How much has been spent against one budget in a month, as GET /api/budgets/status
 * returns it (US-35). `status` is "under" (below 80%), "warning" (80% up to and
 * including 100%) or "over" (above the limit). One cent over is "over" while
 * percent_used is still 100, so use `status` to tell full from over.
 *
 * @typedef {object} BudgetStatus
 * @property {string} id The budget's id.
 * @property {string} category
 * @property {number} limit_cents
 * @property {number} spent_cents
 * @property {number} remaining_cents Negative when over the limit.
 * @property {number} percent_used Rounded down; can be more than 100.
 * @property {'under'|'warning'|'over'} status
 */

/**
 * Spending against each of the signed-in user's budgets in one month, in category
 * order. Limits aren't kept per month, so every month uses the current limits.
 *
 * @param {string} month YYYY-MM, in the user's own calendar.
 * @returns {Promise<{ month: string, budgets: BudgetStatus[] }>}
 * @throws {import('./client').ApiError}
 */
export async function getBudgetStatus(month) {
  const data = await apiRequest(`/api/budgets/status?month=${encodeURIComponent(month)}`)
  return { month: data?.month ?? month, budgets: data?.budgets ?? [] }
}

/**
 * Deletes a budget.
 *
 * @param {string} id
 * @throws {import('./client').ApiError} With kind 'not_found' if it was already gone.
 */
export async function deleteBudget(id) {
  await apiRequest(budgetPath(id), { method: 'DELETE' })
}
