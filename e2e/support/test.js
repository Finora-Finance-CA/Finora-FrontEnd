// The `test` every browser test imports instead of Playwright's own. Before each test:
//
// - the browser's clock is fixed at NOW, so dates, "this month" and screenshots never move;
// - every request goes through MockBackend (mockBackend.js), so pages get realistic data
//   with no real API, Supabase or database;
// - unless the test says `test.use({ signedIn: false })`, a Supabase session for USER is
//   saved in localStorage the way supabase-js saves one, so pages open signed in.
//
// After each test it fails if any request reached no mock.

import { test as base, expect } from '@playwright/test'
import { NOW } from './fixtures.js'
import { MockBackend, sessionFor } from './mockBackend.js'

// supabase-js keeps the session under sb-<first part of the Supabase host>-auth-token.
// playwright.config.js points VITE_SUPABASE_URL at the dev server, on localhost.
export const SESSION_STORAGE_KEY = 'sb-localhost-auth-token'

export const test = base.extend({
  signedIn: [true, { option: true }],

  backend: [
    async ({ page, baseURL, signedIn }, use) => {
      const backend = new MockBackend({ appOrigin: new URL(baseURL).origin })
      await page.clock.setFixedTime(NOW)
      await page.route('**/*', (route) => backend.handle(route))

      if (signedIn) {
        // Only on the first page load of the test, so a reload after logging out stays
        // signed out, as it would in a real browser.
        await page.addInitScript(
          ([key, value]) => {
            if (sessionStorage.getItem('e2e-session-seeded')) return
            sessionStorage.setItem('e2e-session-seeded', 'yes')
            localStorage.setItem(key, value)
          },
          [SESSION_STORAGE_KEY, JSON.stringify(sessionFor())]
        )
      }

      await use(backend)

      expect(backend.unmocked, 'Requests that no mock answered (nothing may reach a real server)').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/**
 * Fails unless the page is no wider than the window: no horizontal scrolling.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function expectNoHorizontalScroll(page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth, `the page is ${scrollWidth}px wide in a ${innerWidth}px window`).toBeLessThanOrEqual(innerWidth)
}
