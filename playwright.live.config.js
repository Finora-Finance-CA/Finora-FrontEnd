// npm run e2e:live (US-61): the main flow against the real app, run by hand, never in CI.
// It drives the front-end you have running on this machine (npm run dev), which talks to
// your locally running API and, through it, the real database and Supabase Auth. Nothing
// is mocked. See "Live browser test" in the README for the steps.
//
// Settings come from the environment, or from .env.e2e (gitignored, like every .env.*):
//   E2E_BASE_URL       the front-end, default http://localhost:5173 (must be localhost)
//   E2E_EMAIL_DOMAIN   domain for the new account's address, default E2E_EMAIL's domain
//   E2E_EMAIL, E2E_PASSWORD  an existing, confirmed account, used only if Supabase asks
//                      new accounts to confirm their email first

import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

if (existsSync('.env.e2e')) process.loadEnvFile('.env.e2e')

const baseURL = (process.env.E2E_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '')
const { hostname } = new URL(baseURL)
if (!['localhost', '127.0.0.1'].includes(hostname)) {
  throw new Error(`E2E_BASE_URL must be the front-end running on this machine (localhost), not ${hostname}.`)
}

export default defineConfig({
  testDir: './e2e-live',
  testMatch: '**/*.live.spec.js',
  outputDir: './test-results/e2e-live',
  // One at a time: with the fallback account, both runs would share its budgets.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-live' }]],
  use: {
    baseURL,
    locale: 'en-CA',
    colorScheme: 'light',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'live-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    {
      name: 'live-phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true },
    },
  ],
})
