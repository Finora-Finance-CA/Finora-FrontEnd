// listTransactions through the real API client. Only fetch and the Supabase session are fake.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { listQueryString, listTransactions } from './transactions'

function respondWith(status, body) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listQueryString', () => {
  it('is empty for the first page with no filters', () => {
    expect(listQueryString()).toBe('')
    expect(listQueryString({ page: 1, q: '  ', categories: [], from: '', to: '' })).toBe('')
  })

  it('sends every filter in the shape the API expects', () => {
    expect(
      listQueryString({ page: 2, q: ' 50% off ', categories: ['Food', 'Housing'], from: '2026-09-01', to: '2026-09-30' })
    ).toBe('?page=2&q=50%25+off&category=Food&category=Housing&from=2026-09-01&to=2026-09-30')
  })
})

describe('listTransactions', () => {
  it('asks for the filtered page and returns the transactions and pagination', async () => {
    const page = {
      transactions: [{ id: '1' }],
      pagination: { page: 2, page_size: 20, total_count: 21, total_pages: 2 },
    }
    const fetch = respondWith(200, page)

    await expect(listTransactions({ page: 2, q: 'lunch', categories: ['Food'] })).resolves.toEqual(page)
    expect(fetch.mock.calls[0][0]).toBe('/api/transactions?page=2&q=lunch&category=Food')
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-access-token')
  })

  it('fills in the pagination if the API leaves it out', async () => {
    respondWith(200, { transactions: [{ id: '1' }, { id: '2' }] })

    await expect(listTransactions()).resolves.toEqual({
      transactions: [{ id: '1' }, { id: '2' }],
      pagination: { page: 1, page_size: 20, total_count: 2, total_pages: 1 },
    })
  })

  it('turns a 400 into a validation error with the API’s field messages', async () => {
    respondWith(400, { errors: { to: 'to must be on or after from.' } })

    await expect(listTransactions({ from: '2026-10-01', to: '2026-09-01' })).rejects.toMatchObject({
      kind: 'validation',
      fieldErrors: { to: 'to must be on or after from.' },
    })
  })
})
