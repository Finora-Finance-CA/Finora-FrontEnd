// The one place the app talks to the Finora API. Every call goes through
// apiRequest, which adds the base URL and Bearer token and turns failures into an
// ApiError with a `kind` the UI can switch on:
//
//   'validation'   400 with { errors: { field: message } }, in `fieldErrors`
//   'unauthorized' 401, or no token to send
//   'network'      the server couldn't be reached or took too long
//   'server'       anything else (500, unexpected responses, other 4xx)

import { getAuthToken } from '../auth/token'

// Empty in development so requests go to /api on the Vite dev server, which
// proxies them to the API (see vite.config.js).
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

const TIMEOUT_MS = 20_000

export class ApiError extends Error {
  /**
   * @param {'validation'|'unauthorized'|'network'|'server'} kind
   * @param {string} message Plain-language message, safe to show to the user.
   * @param {{ status?: number, fieldErrors?: Record<string, string> }} [details]
   */
  constructor(kind, message, { status = null, fieldErrors = {} } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const MESSAGES = {
  unauthorized: 'Your session has ended. Sign in again.',
  network: "We couldn't reach the server. Check your connection and try again.",
  timeout: 'The server took too long to respond. Please try again.',
  server: 'Something went wrong on our end. Please try again in a moment.',
  validation: 'Some details need fixing. Check the highlighted fields.',
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Sends a request to the API and returns the parsed JSON body.
 *
 * @param {string} path API path starting with "/", e.g. "/api/transactions".
 * @param {{ method?: string, body?: unknown, auth?: boolean }} [options]
 *   `auth` (default true) sends the Bearer token and fails with 'unauthorized'
 *   without calling the API if there is none.
 * @throws {ApiError}
 */
export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
      const token = await getAuthToken()
    if (!token) {
      throw new ApiError('unauthorized', MESSAGES.unauthorized)
    }
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError'
    throw new ApiError('network', timedOut ? MESSAGES.timeout : MESSAGES.network)
  }

  const data = await readJson(response)

  if (response.ok) return data

  if (response.status === 401) {
    throw new ApiError('unauthorized', MESSAGES.unauthorized, { status: 401 })
  }

  if (response.status === 400 && data?.errors && typeof data.errors === 'object') {
    throw new ApiError('validation', MESSAGES.validation, {
      status: 400,
      fieldErrors: data.errors,
    })
  }

  throw new ApiError('server', MESSAGES.server, { status: response.status })
}
