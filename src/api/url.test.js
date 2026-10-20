import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiBaseUrl, apiUrl } from './url'

describe('apiBaseUrl', () => {
  it.each([undefined, '', '   '])('is empty in development when VITE_API_URL is %j, so the Vite proxy is used', (value) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(apiBaseUrl(value)).toBe('')
    expect(error).not.toHaveBeenCalled()
  })

  it('says so in a production build with no VITE_API_URL', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(apiBaseUrl('', { production: true })).toBe('')
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/VITE_API_URL is not set/))
  })

  it.each([
    ['https://finora-api.onrender.com', 'https://finora-api.onrender.com'],
    ['https://finora-api.onrender.com/', 'https://finora-api.onrender.com'],
    ['  https://finora-api.onrender.com//  ', 'https://finora-api.onrender.com'],
    ['http://localhost:4000', 'http://localhost:4000'],
  ])('uses %j as %j', (value, expected) => {
    expect(apiBaseUrl(value, { production: true })).toBe(expected)
  })

  it.each(['finora-api.onrender.com', 'ftp://finora-api.onrender.com', '/api'])(
    'reports %j and falls back to the same origin',
    (value) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(apiBaseUrl(value, { production: true })).toBe('')
      expect(error).toHaveBeenCalledWith(expect.stringMatching(/must be a full address/))
    }
  )
})

describe('apiUrl', () => {
  it('keeps the path relative when there is no base URL', () => {
    expect(apiUrl('', '/api/transactions?page=2')).toBe('/api/transactions?page=2')
  })

  it('puts the base URL in front of the path', () => {
    expect(apiUrl('https://finora-api.onrender.com', '/api/summary?month=2026-10')).toBe(
      'https://finora-api.onrender.com/api/summary?month=2026-10'
    )
  })

  it('refuses a path without a leading slash, which would join into a wrong host', () => {
    expect(() => apiUrl('https://finora-api.onrender.com', 'api/budgets')).toThrow(/must start with "\/"/)
  })
})

describe('apiRequest with VITE_API_URL set', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('sends every request to the API host', async () => {
    vi.stubEnv('VITE_API_URL', 'https://finora-api.onrender.com/')
    vi.resetModules()
    const fetch = vi.fn(async () => new Response('{"budgets":[]}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)

    // A fresh copy of client.js, so it reads the stubbed VITE_API_URL. No token: the
    // fresh module has its own copy of the fake Supabase session.
    const { apiRequest } = await import('./client')
    await apiRequest('/api/budgets', { auth: false })

    expect(fetch.mock.calls[0][0]).toBe('https://finora-api.onrender.com/api/budgets')
  })
})
