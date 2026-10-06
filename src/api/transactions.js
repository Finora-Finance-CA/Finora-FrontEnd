import { apiRequest } from './client'

/**
 * Creates a transaction for the signed-in user.
 *
 * @param {{ amount_cents: number, date: string, type: 'income'|'expense', category?: string, description?: string }} payload
 * @returns {Promise<object>} The created transaction.
 * @throws {import('./client').ApiError}
 */
export async function createTransaction(payload) {
  const data = await apiRequest('/api/transactions', { method: 'POST', body: payload })
  return data?.transaction
}
