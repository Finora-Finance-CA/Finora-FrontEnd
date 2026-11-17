// The real API client and token helper. Only fetch and the Supabase session are fake.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetFakeSupabase } from '../test/fakeSupabase'
import { TIMEOUT_MS, apiRequest } from './client'
import { SLOW_REQUEST_MS, isWaitingOnSlowRequest, onSessionExpired, subscribeToSlowRequests } from './requestEvents'

function respondWith(status, body) {
  const fetch = vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
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
    [401, { error: 'Invalid or expired token.' }, { kind: 'unauthorized', message: 'Your session expired, please log in again.' }],
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

  it('turns a 409 into a conflict error with its own message, never the API’s text', async () => {
    respondWith(409, { error: 'You already have a budget for Food. Change that one instead.' })

    await expect(apiRequest('/api/budgets', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'conflict',
      status: 409,
      message: 'That already exists.',
    })
  })

  it.each([
    [500, { error: 'TypeError: cannot read properties of undefined (reading x) at /srv/app.js:12' }],
    [503, { error: 'Service Unavailable' }],
    [403, { error: 'Forbidden by policy abc' }],
    [413, { error: 'request entity too large' }],
    [429, { error: 'Too many requests from 1.2.3.4' }],
  ])('never shows the API’s text for a %i', async (status, body) => {
    respondWith(status, body)

    const error = await apiRequest('/api/transactions').catch((err) => err)

    expect(error).toMatchObject({ kind: 'server', status, message: 'Something went wrong on our end. Please try again in a moment.' })
    expect(error.message).not.toContain(body.error)
  })

  it.each([
    ['an HTML page', '<html><body>Bad gateway</body></html>'],
    ['a cut-off JSON body', '{"transactions": ['],
    ['an empty 200', ''],
    ['a JSON array', '[1, 2]'],
    ['a JSON string', '"ok"'],
  ])('turns an unexpected success response (%s) into a server error, not a crash', async (_, text) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(text, { status: 200 })))

    await expect(apiRequest('/api/transactions')).rejects.toMatchObject({
      kind: 'server',
      message: 'Something went wrong on our end. Please try again in a moment.',
    })
  })

  it('treats a 400 without field errors as a server error', async () => {
    respondWith(400, { errors: ['amount'] })

    await expect(apiRequest('/api/transactions')).rejects.toMatchObject({ kind: 'server' })
  })

  it.each([
    ['no body', undefined],
    ['no message', {}],
    ['a message that is not text', { error: { detail: 'x' } }],
    ['a very long message', { error: 'x'.repeat(500) }],
  ])('uses a plain message for a 409 with %s', async (_, body) => {
    respondWith(409, body)

    await expect(apiRequest('/api/budgets')).rejects.toMatchObject({ kind: 'conflict', message: 'That already exists.' })
  })

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(apiRequest('/api/transactions')).rejects.toMatchObject({
      kind: 'network',
      message: "We couldn't reach the server. Check your connection and try again.",
    })
  })

  it('says the browser is offline when it is, instead of blaming the server', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(apiRequest('/api/transactions')).rejects.toMatchObject({
      kind: 'network',
      message: 'You appear to be offline. Check your connection and try again.',
    })
  })

  it('waits long enough for the server to wake up from a cold start', () => {
    expect(TIMEOUT_MS).toBeGreaterThanOrEqual(60_000)
  })

  it('reports a request that took too long', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')))

    await expect(apiRequest('/api/transactions')).rejects.toMatchObject({
      kind: 'network',
      message: 'The server took too long to respond. Please try again.',
    })
  })
})

describe('session expiry (US-57)', () => {
  it.each([
    ['a 401 from the API', () => respondWith(401, { error: 'Invalid or expired token.' })],
    ['no session to send', () => resetFakeSupabase({ session: null })],
  ])('is reported for %s', async (_, arrange) => {
    arrange()
    const listener = vi.fn()
    const stop = onSessionExpired(listener)

    await apiRequest('/api/transactions').catch(() => {})
    stop()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('is not reported for other failures', async () => {
    respondWith(500, {})
    const listener = vi.fn()
    const stop = onSessionExpired(listener)

    await apiRequest('/api/transactions').catch(() => {})
    stop()

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('slow requests (US-57)', () => {
  it(`counts a request as slow after ${SLOW_REQUEST_MS} ms, until it ends`, async () => {
    vi.useFakeTimers()
    let answer
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => (answer = resolve))))
    const changes = vi.fn()
    const stop = subscribeToSlowRequests(changes)

    const request = apiRequest('/api/transactions')
    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_MS - 1)
    expect(isWaitingOnSlowRequest()).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(isWaitingOnSlowRequest()).toBe(true)

    answer(new Response(JSON.stringify({ transactions: [] }), { status: 200 }))
    await request
    expect(isWaitingOnSlowRequest()).toBe(false)
    expect(changes).toHaveBeenCalledTimes(2)
    stop()
  })

  it('never counts a quick request as slow', async () => {
    vi.useFakeTimers()
    respondWith(200, {})
    const changes = vi.fn()
    const stop = subscribeToSlowRequests(changes)

    await apiRequest('/api/transactions')
    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_MS * 2)

    expect(changes).not.toHaveBeenCalled()
    expect(isWaitingOnSlowRequest()).toBe(false)
    stop()
  })

  it('stops counting a slow request that fails', async () => {
    vi.useFakeTimers()
    let fail
    vi.stubGlobal('fetch', vi.fn(() => new Promise((_, reject) => (fail = reject))))

    const request = apiRequest('/api/transactions').catch((err) => err)
    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_MS)
    expect(isWaitingOnSlowRequest()).toBe(true)

    fail(new TypeError('Failed to fetch'))
    expect(await request).toMatchObject({ kind: 'network' })
    expect(isWaitingOnSlowRequest()).toBe(false)
  })
})

describe('caching (US-59)', () => {
  it('never lets the browser keep or reuse an answer, which is one user’s data', async () => {
    const fetch = respondWith(200, { transactions: [] })

    await apiRequest('/api/transactions')

    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'no-store' })
  })
})
