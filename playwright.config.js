// Browser tests (npm run e2e): Chromium against the Vite dev server, with every API and
// Supabase request answered by the mock in e2e/support (no real backend or database).
// Vitest never runs these: it only looks in src/ for *.test.js(x); Playwright only
// looks in e2e/ for *.spec.js.

import { defineConfig, devices } from '@playwright/test'

const PORT = 5174
const ORIGIN = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  outputDir: './test-results/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : [['list']],
  expect: { timeout: 10_000 },
  use: {
    baseURL: ORIGIN,
    timezoneId: 'America/Toronto',
    locale: 'en-CA',
    colorScheme: 'light',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: ORIGIN,
    // Always a fresh server with the env below, never one already running with .env.
    reuseExistingServer: false,
    timeout: 120_000,
    // These win over anything in .env, so the app under test points only at the dev
    // server itself: the API at /api and Supabase at /supabase-e2e, both answered by
    // the mock. A request anywhere else fails the test (e2e/support/test.js).
    env: {
      ...process.env,
      VITE_API_URL: ORIGIN,
      VITE_SUPABASE_URL: `${ORIGIN}/supabase-e2e`,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e_mock',
    },
  },
})
