// Transactions shaped exactly like the API's responses, for tests.

let nextId = 1000

/** A complete transaction as GET/POST/PUT /api/transactions return it. */
export function makeTransaction(overrides = {}) {
  nextId += 1
  return {
    id: String(nextId),
    user_id: '0f7a3c52-6b1e-4d2a-9c3f-1a2b3c4d5e6f',
    amount_cents: 1250,
    date: '2026-10-05',
    type: 'expense',
    category: 'Food',
    description: 'Lunch',
    created_at: '2026-10-05T18:30:00.000Z',
    updated_at: '2026-10-05T18:30:00.000Z',
    ...overrides,
  }
}

/**
 * What listTransactions resolves to for one page: the transactions and the API's
 * pagination object. `total_count` defaults to the number of transactions given.
 */
export function pageOf(transactions, { page = 1, page_size = 20, total_count = transactions.length } = {}) {
  return {
    transactions,
    pagination: { page, page_size, total_count, total_pages: Math.ceil(total_count / page_size) },
  }
}

/** The query listTransactions gets with no search or filters, on page 1. */
export const NO_FILTERS = Object.freeze({ page: 1, q: '', categories: [], from: '', to: '' })

/** What the API sends back for a POST or PUT with this body: the body plus the saved fields. */
export function savedFrom(payload, overrides = {}) {
  return makeTransaction({ category: null, description: null, ...payload, ...overrides })
}
