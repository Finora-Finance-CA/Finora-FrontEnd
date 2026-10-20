// Where API requests go (US-34). client.js is the only caller.
//
// - Development: VITE_API_URL is empty, so requests go to /api on the Vite dev server,
//   which proxies them to http://localhost:4000 (see vite.config.js).
// - Production: VITE_API_URL is the API's address, e.g. https://finora-api.onrender.com,
//   set on the host before the build (Vite bakes it into the bundle).

/**
 * @param {string|undefined} value VITE_API_URL.
 * @param {{ production?: boolean }} [options] `production` is true in a production build.
 * @returns {string} The base URL with no trailing slash, or '' to use the same origin.
 *   Reports a missing or invalid value in the console, where whoever deployed it will
 *   look, and falls back to '' rather than breaking every page.
 */
export function apiBaseUrl(value, { production = false } = {}) {
  const base = (value ?? '').trim().replace(/\/+$/, '')

  if (!base) {
    if (production) {
      console.error('VITE_API_URL is not set, so API requests go to this site instead of the API. Set it and build again.')
    }
    return ''
  }

  let url
  try {
    url = new URL(base)
  } catch {
    url = null
  }
  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    console.error('VITE_API_URL must be a full address starting with https://, e.g. https://finora-api.onrender.com.')
    return ''
  }
  return base
}

/**
 * @param {string} base From apiBaseUrl.
 * @param {string} path Starts with "/", e.g. "/api/transactions?page=2".
 * @returns {string}
 */
export function apiUrl(base, path) {
  if (!path.startsWith('/')) {
    throw new Error(`API paths must start with "/": ${path}`)
  }
  return `${base}${path}`
}
