// After a redeploy, a tab that was already open still has the old index.html, which
// names page chunks (assets/SummaryPage-<hash>.js) that no longer exist on the host.
// Opening a page then fails to load its code. Vite reports that as 'vite:preloadError';
// reloading fetches the new index.html and the new chunks.

const STORAGE_KEY = 'finora:stale-chunk-reload'

// If the page fails again this soon after a reload, the chunk is really missing, so
// let the error show instead of reloading forever.
const RETRY_AFTER_MS = 10_000

/**
 * @param {{ target?: Window, storage?: Storage, now?: () => number }} [options] For tests.
 */
export function reloadOnStaleChunk({ target = window, storage, now = Date.now } = {}) {
  target.addEventListener('vite:preloadError', (event) => {
    try {
      // Read here, not as a default: even reading sessionStorage throws when the
      // browser blocks site data, and that mustn't stop the app from starting.
      const store = storage ?? target.sessionStorage
      const last = Number(store.getItem(STORAGE_KEY))
      if (last && now() - last < RETRY_AFTER_MS) return
      store.setItem(STORAGE_KEY, String(now()))
    } catch {
      // Storage is blocked, so a reload loop couldn't be detected. Don't reload.
      return
    }
    event.preventDefault()
    target.location.reload()
  })
}
