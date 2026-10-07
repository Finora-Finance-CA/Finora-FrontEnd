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

/** What the API sends back for a POST or PUT with this body: the body plus the saved fields. */
export function savedFrom(payload, overrides = {}) {
  return makeTransaction({ category: null, description: null, ...payload, ...overrides })
}
