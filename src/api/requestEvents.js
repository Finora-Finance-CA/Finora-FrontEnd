// Signals from the API client (client.js) to the parts of the app that react to them
// without being involved in the request (US-57):
//
// - Session expired: any request answered with 401 (or sent with no token). AuthProvider
//   signs out, and the login page says why.
// - Slow requests: while any request has been out for SLOW_REQUEST_MS or more, the app
//   shows that the server may be waking up (Render's free tier sleeps after 15 minutes).

// The point at which a wait stops feeling normal and needs explaining.
export const SLOW_REQUEST_MS = 5000
export const WAKING_UP_MESSAGE = 'Waking up the server, this can take up to a minute.'

const sessionExpiredListeners = new Set()
const slowListeners = new Set()
let slowCount = 0

/** @param {() => void} listener @returns {() => void} Unsubscribe. */
export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

export function reportSessionExpired() {
  sessionExpiredListeners.forEach((listener) => listener())
}

/** For useSyncExternalStore: true while at least one request has been slow. */
export function isWaitingOnSlowRequest() {
  return slowCount > 0
}

/** @param {() => void} listener @returns {() => void} Unsubscribe. */
export function subscribeToSlowRequests(listener) {
  slowListeners.add(listener)
  return () => slowListeners.delete(listener)
}

function changeSlowCount(change) {
  const wasSlow = slowCount > 0
  slowCount += change
  if (wasSlow !== slowCount > 0) slowListeners.forEach((listener) => listener())
}

/**
 * Call when a request starts; call the returned function when it ends, however it ends.
 * After SLOW_REQUEST_MS the request counts as slow until it ends.
 *
 * @returns {() => void}
 */
export function trackRequest() {
  let isSlow = false
  const timer = setTimeout(() => {
    isSlow = true
    changeSlowCount(1)
  }, SLOW_REQUEST_MS)
  return () => {
    clearTimeout(timer)
    if (isSlow) changeSlowCount(-1)
  }
}
