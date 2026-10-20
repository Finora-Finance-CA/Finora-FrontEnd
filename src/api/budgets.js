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
 * Deletes a budget.
 *
 * @param {string} id
 * @throws {import('./client').ApiError} With kind 'not_found' if it was already gone.
 */
export async function deleteBudget(id) {
  await apiRequest(budgetPath(id), { method: 'DELETE' })
}
