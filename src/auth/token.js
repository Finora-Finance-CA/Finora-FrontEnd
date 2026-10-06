// Minimal token handling added for US-11 so the Add Expense form can call the API
// before login exists. Ayaan owns auth (US-01 to US-05) and is free to change or
// replace this file.
//
// The access token lives in localStorage under TOKEN_STORAGE_KEY. Login should call
// setAuthToken(token) with the token the API returns, and logout clearAuthToken().

export const TOKEN_STORAGE_KEY = 'finora.accessToken'

function readStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    // Storage can be blocked (private browsing, strict privacy settings).
    return null
  }
}

/**
 * Returns the current access token, or null if the user isn't signed in.
 *
 * In development only, falls back to VITE_DEV_TOKEN so the API can be tested
 * before login exists. import.meta.env.DEV is false in production builds, so the
 * fallback and the token value are removed from the bundle.
 */
export function getAuthToken() {
  const stored = readStoredToken()
  if (stored) return stored

  if (import.meta.env.DEV && import.meta.env.VITE_DEV_TOKEN) {
    return import.meta.env.VITE_DEV_TOKEN.trim()
  }
  return null
}

export function setAuthToken(token) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken() {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
