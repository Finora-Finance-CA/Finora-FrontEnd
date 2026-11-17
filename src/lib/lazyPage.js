// Lazy-loaded pages that can be tried again (US-57). React.lazy remembers a failed
// import for good, so a page whose code didn't download (e.g. offline) would fail again
// on every retry. lazyPage starts a fresh lazy component after a failure, once
// resetFailedPages() is called (the error boundary's Try again does that).

import { createElement, lazy } from 'react'

const resets = new Set()

/**
 * @param {() => Promise<{ default: import('react').ComponentType }>} load e.g. () => import('./pages/GoalsPage')
 * @returns {import('react').ComponentType}
 */
export function lazyPage(load) {
  let failed = false
  const create = () =>
    lazy(() =>
      load().catch((error) => {
        failed = true
        throw error
      })
    )
  let LazyComponent = create()

  resets.add(() => {
    if (!failed) return
    failed = false
    LazyComponent = create()
  })

  return function Page(props) {
    return createElement(LazyComponent, props)
  }
}

/** Makes every page whose code failed to load try again the next time it renders. */
export function resetFailedPages() {
  resets.forEach((reset) => reset())
}
