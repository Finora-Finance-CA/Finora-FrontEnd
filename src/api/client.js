// The one place the app talks to the Finora API. Every call goes through
// apiRequest, which adds the base URL and Bearer token and turns failures into an
// ApiError with a `kind` the UI can switch on:
//
//   'validation'   400 with { errors: { field: message } }, in `fieldErrors`
//   'unauthorized' 401, or no token to send
//   'not_found'    404: the item doesn't exist, or belongs to another user
//   'conflict'     409: it clashes with something the user already has, e.g. a
//                  second budget for one category. The API's message says what.
//   'network'      the server couldn't be reached or took too long
//   'server'       anything else (500, unexpected responses, other 4xx)

import { getAuthToken } from '../auth/token'
import { apiBaseUrl, apiUrl } from './url'

// Empty in development so requests go to /api on the Vite dev server, which
// proxies them to the API. The API's address in production (see url.js).
const BASE_URL = apiBaseUrl(import.meta.env.VITE_API_URL, { production: import.meta.env.PROD })

const TIMEOUT_MS = 20_000

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

const MESSAGES = {
  unauthorized: 'Your session has ended. Sign in again.',
  not_found: "We couldn't find that. It may have been deleted.",
  conflict: 'That already exists.',
  network: "We couldn't reach the server. Check your connection and try again.",
  timeout: 'The server took too long to respond. Please try again.',
  server: 'Something went wrong on our end. Please try again in a moment.',
  validation: 'Some details need fixing. Check the highlighted fields.',
}

// The API writes its 409 messages for people ("You already have a budget for Food.
// Change that one instead."), so show it. Fall back if it's missing or looks wrong.
const MAX_CONFLICT_MESSAGE_LENGTH = 200

function conflictMessage(data) {
  const message = data?.error
  return typeof message === 'string' && message.trim() && message.length <= MAX_CONFLICT_MESSAGE_LENGTH
    ? message.trim()
    : MESSAGES.conflict
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
    response = await fetch(apiUrl(BASE_URL, path), {
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

  if (response.status === 404) {
    throw new ApiError('not_found', MESSAGES.not_found, { status: 404 })
  }

  if (response.status === 409) {
    throw new ApiError('conflict', conflictMessage(data), { status: 409 })
  }

  if (response.status === 400 && data?.errors && typeof data.errors === 'object') {
    throw new ApiError('validation', MESSAGES.validation, {
      status: 400,
      fieldErrors: data.errors,
    })
  }

  throw new ApiError('server', MESSAGES.server, { status: response.status })
}
