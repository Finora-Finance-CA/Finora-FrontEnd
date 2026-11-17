// The one place the app talks to the Finora API. Every call goes through
// apiRequest, which adds the base URL and Bearer token and turns failures into an
// ApiError with a `kind` the UI can switch on:
//
//   'validation'   400 with { errors: { field: message } }, in `fieldErrors`
//   'unauthorized' 401, or no token to send. Also reported to requestEvents, so the
//                  app signs out and the login page says the session expired.
//   'not_found'    404: the item doesn't exist, or belongs to another user
//   'conflict'     409: it clashes with something the user already has, e.g. a
//                  second budget for one category
//   'network'      the server couldn't be reached, the browser is offline, or the
//                  server took too long
//   'server'       anything else: 500s, other 4xx, and answers that aren't what the
//                  API sends (e.g. not JSON)
//
// Every ApiError's message is written here, in plain language. Text from the API's
// { error } is never shown; only its 400 field messages are (see
// ../validation/apiErrors.js).

import { getAuthToken } from '../auth/token'
import { reportSessionExpired, trackRequest } from './requestEvents'
import { apiBaseUrl, apiUrl } from './url'

// Empty in development so requests go to /api on the Vite dev server, which
// proxies them to the API. The API's address in production (see url.js).
const BASE_URL = apiBaseUrl(import.meta.env.VITE_API_URL, { production: import.meta.env.PROD })

// Long enough for the API to wake up on Render's free tier (up to a minute); after
// 5 seconds the app says it may be waking up (requestEvents.js).
export const TIMEOUT_MS = 65_000

export class ApiError extends Error {
  /**
   * @param {'validation'|'unauthorized'|'not_found'|'conflict'|'network'|'server'} kind
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

export const MESSAGES = Object.freeze({
  unauthorized: 'Your session expired, please log in again.',
  not_found: "We couldn't find that. It may have been deleted.",
  conflict: 'That already exists.',
  offline: 'You appear to be offline. Check your connection and try again.',
  network: "We couldn't reach the server. Check your connection and try again.",
  timeout: 'The server took too long to respond. Please try again.',
  server: 'Something went wrong on our end. Please try again in a moment.',
  validation: 'Some details need fixing. Check the highlighted fields.',
})

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function unauthorized(status) {
  reportSessionExpired()
  return new ApiError('unauthorized', MESSAGES.unauthorized, { status })
}

/**
 * Sends a request to the API and returns the parsed JSON body.
 *
 * @param {string} path API path starting with "/", e.g. "/api/transactions".
 * @param {{ method?: string, body?: unknown, auth?: boolean }} [options]
 *   `auth` (default true) sends the Bearer token and fails with 'unauthorized'
 *   without calling the API if there is none.
 * @returns {Promise<object|null>} The JSON object, or null for a 204.
 * @throws {ApiError}
 */
export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = await getAuthToken()
    if (!token) throw unauthorized(null)
    headers.Authorization = `Bearer ${token}`
  }

  const done = trackRequest()
  let response
  let data
  try {
    response = await fetch(apiUrl(BASE_URL, path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    data = response.status === 204 ? null : await readJson(response)
  } catch (err) {
    if (isOffline()) throw new ApiError('network', MESSAGES.offline)
    const timedOut = err?.name === 'TimeoutError'
    throw new ApiError('network', timedOut ? MESSAGES.timeout : MESSAGES.network)
  } finally {
    done()
  }

  if (response.ok) {
    // The API always answers with a JSON object, or nothing for a 204. Anything else
    // (an HTML error page from a proxy, a cut-off body) would break the page that reads it.
    if (data === null || (data !== null && typeof data === 'object' && !Array.isArray(data))) return data
    throw new ApiError('server', MESSAGES.server, { status: response.status })
  }

  if (response.status === 401) throw unauthorized(401)

  if (response.status === 404) {
    throw new ApiError('not_found', MESSAGES.not_found, { status: 404 })
  }

  if (response.status === 409) {
    throw new ApiError('conflict', MESSAGES.conflict, { status: 409 })
  }

  if (response.status === 400 && data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    throw new ApiError('validation', MESSAGES.validation, {
      status: 400,
      fieldErrors: data.errors,
    })
  }

  throw new ApiError('server', MESSAGES.server, { status: response.status })
}
