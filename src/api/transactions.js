import { TRANSACTION_PAGE_SIZE } from '../transactions/constants'
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
 * What to list: a page, and optional search and filters. Empty values are left out.
 *
 * @typedef {object} TransactionListQuery
 * @property {number} [page] 1-based; defaults to 1.
 * @property {string} [q] Text the description must contain (any case).
 * @property {string[]} [categories] Only these categories.
 * @property {string} [from] YYYY-MM-DD, inclusive.
 * @property {string} [to] YYYY-MM-DD, inclusive.
 */

/**
 * @typedef {object} TransactionPage
 * @property {object[]} transactions Newest first.
 * @property {{ page: number, page_size: number, total_count: number, total_pages: number }} pagination
 */

/** The query string for GET /api/transactions, e.g. "?q=lunch&category=Food". */
export function listQueryString({ page = 1, q = '', categories = [], from = '', to = '' } = {}) {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (q.trim()) params.set('q', q.trim())
  for (const category of categories) params.append('category', category)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const text = params.toString()
  return text ? `?${text}` : ''
}

/**
 * One page of the signed-in user's transactions that match the query, newest first,
 * with how many match in total.
 *
 * @param {TransactionListQuery} [query]
 * @returns {Promise<TransactionPage>}
 * @throws {import('./client').ApiError}
 */
export async function listTransactions(query = {}) {
  const data = await apiRequest(`/api/transactions${listQueryString(query)}`)
  const transactions = data?.transactions ?? []
  return {
    transactions,
    pagination: data?.pagination ?? {
      page: query.page ?? 1,
      page_size: TRANSACTION_PAGE_SIZE,
      total_count: transactions.length,
      total_pages: transactions.length > 0 ? 1 : 0,
    },
  }
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
