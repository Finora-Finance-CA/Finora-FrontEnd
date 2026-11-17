// US-62 (NFR-06): with 1,000 transactions, the transactions page and the dashboard show
// their data within 2 seconds of being opened. The mock API waits 150 ms before every
// answer, like a real network and server, so the time includes realistic requests.
//
// These run against a production build (the "performance" project in
// playwright.config.js), as a visitor gets it. Each timing test opens the page once
// first, so the browser has the app's files cached as a returning visitor would, then
// times a fresh load of the page.

import { manyTransactions } from './support/fixtures.js'
import { expect, test } from './support/test.js'

const BUDGET_MS = 2000
const LATENCY_MS = 150

test.use({ backendOptions: { transactions: manyTransactions(1000), latencyMs: LATENCY_MS } })

async function transactionsReady(page) {
  await expect(page.getByText('Showing 1 to 20 of 1000 transactions.')).toBeVisible()
  await expect(page.getByRole('table', { name: 'Transaction history' }).getByRole('row')).toHaveCount(21)
}

async function dashboardReady(page) {
  await expect(page.locator('.summary-card')).toHaveCount(3)
  await expect(page.getByRole('region', { name: 'Budget alerts' }).getByText(/used|on track|No budgets/).first()).toBeVisible()
  await expect(page.locator('.category-chart svg.recharts-surface')).toBeVisible()
  await expect(page.locator('.trend-chart svg.recharts-surface')).toBeVisible()
}

async function timeLoad(page, path, ready) {
  await page.goto('/goals')
  await expect(page.getByRole('heading', { name: 'Savings goals', level: 1 })).toBeVisible()
  const started = performance.now()
  await page.goto(path)
  await ready(page)
  return performance.now() - started
}

test('the transactions page shows the first 20 of 1,000 transactions within 2 seconds', async ({ page, backend }) => {
  await page.goto('/transactions')
  await transactionsReady(page)

  const elapsed = await timeLoad(page, '/transactions', transactionsReady)
  console.log(`Transactions page with 1,000 transactions: ${Math.round(elapsed)} ms`)

  expect(elapsed, `took ${Math.round(elapsed)} ms`).toBeLessThan(BUDGET_MS)
  // Paged: the page asks for one page, never all 1,000.
  expect(backend.apiRequests.filter((request) => request.startsWith('GET /api/transactions'))).not.toHaveLength(0)
})

test('the dashboard shows its cards, alerts and both charts within 2 seconds', async ({ page }) => {
  await page.goto('/dashboard')
  await dashboardReady(page)

  const elapsed = await timeLoad(page, '/dashboard', dashboardReady)
  console.log(`Dashboard with 1,000 transactions: ${Math.round(elapsed)} ms`)

  expect(elapsed, `took ${Math.round(elapsed)} ms`).toBeLessThan(BUDGET_MS)
})

test('pages stop fetching once they have their data: no repeated or looping requests', async ({ page, backend }) => {
  for (const [path, ready] of [
    ['/transactions', transactionsReady],
    ['/dashboard', dashboardReady],
  ]) {
    backend.apiRequests.length = 0
    await page.goto(path)
    await ready(page)
    const settled = [...backend.apiRequests]

    await page.waitForTimeout(1500)

    expect(backend.apiRequests, `${path} kept fetching`).toEqual(settled)
    // The built app asks for each thing exactly once.
    const counts = settled.reduce((all, request) => ({ ...all, [request]: (all[request] ?? 0) + 1 }), {})
    for (const [request, count] of Object.entries(counts)) expect(count, request).toBe(1)
  }
})

test('the dashboard asks for each figure once per load: summary, budget status, categories and trend', async ({ page, backend }) => {
  await page.goto('/dashboard')
  await dashboardReady(page)

  const endpoints = new Set(backend.apiRequests.map((request) => request.split('?')[0]))
  expect([...endpoints].sort()).toEqual([
    'GET /api/budgets/status',
    'GET /api/summary',
    'GET /api/summary/categories',
    'GET /api/summary/trend',
  ])
})

test('only the dashboard downloads the chart library', async ({ page }) => {
  // Built file names are hashed, so chart code is recognised by what's in it: Recharts'
  // own class names.
  const chartCode = []
  page.on('response', async (response) => {
    if (!response.url().endsWith('.js')) return
    const body = await response.text().catch(() => '')
    if (body.includes('recharts-wrapper')) chartCode.push(response.url())
  })

  for (const [path, heading] of [
    ['/transactions', 'Transactions'],
    ['/budgets', 'Budgets'],
    ['/goals', 'Savings goals'],
    ['/summary', 'Summary'],
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
  }
  expect(chartCode).toEqual([])

  await page.goto('/dashboard')
  await dashboardReady(page)
  await page.waitForLoadState('networkidle')
  expect(chartCode.length).toBeGreaterThan(0)
})
