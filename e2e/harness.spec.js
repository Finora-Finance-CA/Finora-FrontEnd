// The browser test harness itself: pages get the mocked data, signed in, and nothing
// can reach a real server.

import { THIS_MONTH, USER } from './support/fixtures.js'
import { expect, test } from './support/test.js'

test('opens a signed-in page with mocked data, and every API call went to the mock', async ({ page, backend }) => {
  await page.goto('/transactions')

  await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible()
  await expect(page.getByRole('cell', { name: /Freelance design work/ }).first()).toBeVisible()
  await expect(page.getByText(USER.email).first()).toBeAttached()
  expect(backend.apiRequests).toContain('GET /api/transactions')
})

test('fixes the clock, so "this month" is always the fixtures’ month', async ({ page }) => {
  await page.goto('/summary')

  await expect(page).toHaveURL(/\/summary/)
  expect(await page.evaluate(() => new Date().toISOString().slice(0, 7))).toBe(THIS_MONTH)
})

test('blocks and records any request that no mock answers', async ({ page, backend }) => {
  await page.goto('/transactions')
  await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible()

  const failed = await page.evaluate(() =>
    fetch('https://example.com/should-never-be-reached').then(
      () => false,
      () => true
    )
  )

  expect(failed).toBe(true)
  expect(backend.unmocked).toEqual(['GET https://example.com/should-never-be-reached'])
  // Expected here: clear it so the harness's own end-of-test check passes.
  backend.unmocked.length = 0
})

test.describe('signed out', () => {
  test.use({ signedIn: false })

  test('opens the login page, and logging in goes through the mocked Supabase', async ({ page }) => {
    await page.goto('/budgets')

    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
    await page.getByLabel('Email').fill(USER.email)
    await page.getByLabel('Password', { exact: true }).fill('a-strong-password')
    await page.getByRole('button', { name: 'Log in' }).click()

    await expect(page.getByRole('heading', { name: 'Budgets', level: 1 })).toBeVisible()
  })
})
