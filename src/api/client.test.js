// The real API client and token helper. Only fetch and the Supabase session are fake.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetFakeSupabase } from '../test/fakeSupabase'
import { apiRequest } from './client'

function respondWith(status, body) {
  const fetch = vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('sends the Supabase access token and a JSON body, and returns the JSON response', async () => {
    const fetch = respondWith(201, { transaction: { id: '9' } })

    await expect(apiRequest('/api/transactions', { method: 'POST', body: { amount_cents: 100 } })).resolves.toEqual({
      transaction: { id: '9' },
    })

    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/transactions')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer test-access-token')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"amount_cents":100}')
  })

  it('returns null for an empty success response such as 204', async () => {
    respondWith(204)

    await expect(apiRequest('/api/transactions/1', { method: 'DELETE' })).resolves.toBeNull()
  })

  it('never calls the API without a session', async () => {
    resetFakeSupabase({ session: null })
    const fetch = respondWith(200, {})

    await expect(apiRequest('/api/transactions')).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    [401, { error: 'Invalid or expired token.' }, { kind: 'unauthorized', message: 'Your session has ended. Sign in again.' }],
    [
      400,
      { errors: { amount_cents: 'amount_cents is required.' } },
      { kind: 'validation', fieldErrors: { amount_cents: 'amount_cents is required.' } },
    ],
    [404, { error: 'Transaction not found.' }, { kind: 'not_found', message: "We couldn't find that. It may have been deleted." }],
    [500, { error: 'Something went wrong.' }, { kind: 'server', message: 'Something went wrong on our end. Please try again in a moment.' }],
    [400, { error: 'Not JSON.' }, { kind: 'server', status: 400 }],
  ])('turns a %i response into a plain-language ApiError', async (status, body, expected) => {
    respondWith(status, body)

    await expect(apiRequest('/api/transactions')).rejects.toMatchObject({ name: 'ApiError', ...expected })
  })

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(apiRequest('/api/transactions')).rejects.toMatchObject({
      kind: 'network',
      message: "We couldn't reach the server. Check your connection and try again.",
    })
  })

  it('reports a request that took too long', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')))

    await expect(apiRequest('/api/transactions')).rejects.toMatchObject({
      kind: 'network',
      message: 'The server took too long to respond. Please try again.',
    })
  })
})
