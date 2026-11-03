// The budgets and summary API modules through the real API client. Only fetch and the
// Supabase session are fake.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBudget, deleteBudget, getBudgetStatus, listBudgets, updateBudget } from './budgets'
import { getMonthlySummary } from './summary'

function respondWith(status, body) {
  const fetch = vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const BUDGET = { id: '7', category: 'Food', limit_cents: 50000 }

describe('budgets API', () => {
  it('lists budgets', async () => {
    const fetch = respondWith(200, { budgets: [BUDGET] })

    await expect(listBudgets()).resolves.toEqual([BUDGET])
    expect(fetch.mock.calls[0][0]).toBe('/api/budgets')
  })

  it('creates a budget with a POST', async () => {
    const fetch = respondWith(201, { budget: BUDGET })

    await expect(createBudget({ category: 'Food', limit_cents: 50000 })).resolves.toEqual(BUDGET)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/budgets')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"category":"Food","limit_cents":50000}')
  })

  it('changes only the limit with a PUT', async () => {
    const fetch = respondWith(200, { budget: { ...BUDGET, limit_cents: 100 } })

    await updateBudget('7', { limit_cents: 100 })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/budgets/7')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe('{"limit_cents":100}')
  })

  it('deletes with a DELETE', async () => {
    const fetch = respondWith(204)

    await deleteBudget('7')
    expect(fetch.mock.calls[0][0]).toBe('/api/budgets/7')
    expect(fetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('turns a 409 into a conflict error with the API’s message', async () => {
    respondWith(409, { error: 'You already have a budget for Food. Change that one instead.' })

    await expect(createBudget({ category: 'Food', limit_cents: 1 })).rejects.toMatchObject({
      kind: 'conflict',
      status: 409,
      message: 'You already have a budget for Food. Change that one instead.',
    })
  })
})

describe('summary API', () => {
  it('asks for one month', async () => {
    const summary = { month: '2026-10', income_cents: 1, expense_cents: 2, net_cents: -1, transaction_count: 2 }
    const fetch = respondWith(200, summary)

    await expect(getMonthlySummary('2026-10')).resolves.toEqual(summary)
    expect(fetch.mock.calls[0][0]).toBe('/api/summary?month=2026-10')
  })
})

describe('budget status API (US-35)', () => {
  it('gets the status for a month', async () => {
    const body = { month: '2026-10', budgets: [{ ...BUDGET, spent_cents: 40487, remaining_cents: 9513, percent_used: 80, status: 'warning' }] }
    const fetch = respondWith(200, body)

    await expect(getBudgetStatus('2026-10')).resolves.toEqual(body)
    expect(fetch.mock.calls[0][0]).toBe('/api/budgets/status?month=2026-10')
  })

  it('gives an empty list when the response has no budgets', async () => {
    respondWith(200, {})

    await expect(getBudgetStatus('2026-10')).resolves.toEqual({ month: '2026-10', budgets: [] })
  })

  it('throws a validation ApiError for a bad month', async () => {
    respondWith(400, { errors: { month: 'month must be a real month in YYYY-MM format, e.g. 2026-10.' } })

    await expect(getBudgetStatus('2026-13')).rejects.toMatchObject({ kind: 'validation' })
  })
})
