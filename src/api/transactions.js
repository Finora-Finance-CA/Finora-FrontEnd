import { apiRequest } from './client'

/**
 * The body for POST and PUT /api/transactions (see the Finora-API README).
 *
 * @typedef {object} TransactionPayload
 * @property {number} amount_cents
 * @property {string} date YYYY-MM-DD
 * @property {'income'|'expense'} type
 * @property {string} [category] Required for an expense.
 * @property {string} [description]
 */

function transactionPath(id) {
  return `/api/transactions/${encodeURIComponent(id)}`
}

/**
 * The signed-in user's most recent transactions, newest first. The API returns at
 * most 50.
 *
 * @returns {Promise<object[]>}
 * @throws {import('./client').ApiError}
 */
export async function listTransactions() {
  const data = await apiRequest('/api/transactions')
  return data?.transactions ?? []
}

/**
 * Creates a transaction for the signed-in user.
 *
 * @param {TransactionPayload} payload
 * @returns {Promise<object>} The created transaction.
 * @throws {import('./client').ApiError}
 */
export async function createTransaction(payload) {
  const data = await apiRequest('/api/transactions', { method: 'POST', body: payload })
  return data?.transaction
}

/**
 * Replaces every field of one of the signed-in user's transactions. Optional fields
 * left out of `payload` are cleared.
 *
 * @param {string} id
 * @param {TransactionPayload} payload
 * @returns {Promise<object>} The updated transaction.
 * @throws {import('./client').ApiError} With kind 'not_found' if it no longer exists.
 */
export async function updateTransaction(id, payload) {
  const data = await apiRequest(transactionPath(id), { method: 'PUT', body: payload })
  return data?.transaction
}

/**
 * Deletes one of the signed-in user's transactions.
 *
 * @param {string} id
 * @throws {import('./client').ApiError} With kind 'not_found' if it was already gone.
 */
export async function deleteTransaction(id) {
  await apiRequest(transactionPath(id), { method: 'DELETE' })
}
