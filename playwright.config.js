// Browser tests (npm run e2e): Chromium with every API and Supabase request answered by
// the mock in e2e/support (no real backend or database). Two projects:
//
// - chromium: every spec except performance, against the Vite dev server (port 5174).
// - performance: e2e/performance.spec.js (US-62), against a production build served by
//   vite preview (port 5175), since load times only mean something for the built app:
//   the dev server sends hundreds of untransformed modules and React's development mode
//   runs every effect twice on purpose.
//
// Vitest never runs these: it only looks in src/ for *.test.js(x); Playwright only
// looks in e2e/ for *.spec.js.

import { defineConfig, devices } from '@playwright/test'

const DEV_PORT = 5174
const PREVIEW_PORT = 5175
const origin = (port) => `http://localhost:${port}`

// These win over anything in .env, so the app under test points only at its own server:
// the API at /api and Supabase at /supabase-e2e, both answered by the mock. A request
// anywhere else fails the test (e2e/support/test.js).
function mockedEnv(port) {
  return {
    ...process.env,
    VITE_API_URL: origin(port),
    VITE_SUPABASE_URL: `${origin(port)}/supabase-e2e`,
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e_mock',
  }
}

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
    timezoneId: 'America/Toronto',
    locale: 'en-CA',
    colorScheme: 'light',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/performance.spec.js',
      use: { ...devices['Desktop Chrome'], baseURL: origin(DEV_PORT) },
    },
    {
      name: 'performance',
      testMatch: '**/performance.spec.js',
      use: { ...devices['Desktop Chrome'], baseURL: origin(PREVIEW_PORT) },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${DEV_PORT} --strictPort`,
      url: origin(DEV_PORT),
      // Always a fresh server with the env below, never one already running with .env.
      reuseExistingServer: false,
      timeout: 120_000,
      env: mockedEnv(DEV_PORT),
    },
    {
      // Built into its own folder (gitignored), so it never replaces a real build in dist.
      command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PREVIEW_PORT} --strictPort`,
      url: origin(PREVIEW_PORT),
      reuseExistingServer: false,
      timeout: 180_000,
      env: mockedEnv(PREVIEW_PORT),
    },
  ],
})
