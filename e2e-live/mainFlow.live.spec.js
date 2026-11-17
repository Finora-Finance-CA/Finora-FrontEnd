// US-61, live: the main flow against the real front-end, API, database and Supabase
// Auth running on this machine (npm run e2e:live; never in CI). Same steps as the mocked
// test (e2e/flows/mainFlow.js): register a new e2e+<timestamp> account, add an expense,
// set a Food budget, check the dashboard, log out and back in, then clean up.
//
// If Supabase asks new accounts to confirm their email, it logs in with E2E_EMAIL and
// E2E_PASSWORD instead. Every check is against the figures read before the flow began,
// so an account with data of its own still passes, and what the test added is removed
// at the end.

import { expect, test } from '@playwright/test'
import {
  addExpense,
  centsFrom,
  dashboardFigures,
  deleteTransaction,
  dollarsFrom,
  expectBudgetRow,
  expectDashboard,
  logIn,
  logOut,
  openPage,
  registerOrLogIn,
  removeBudget,
  setBudget,
} from '../e2e/flows/mainFlow.js'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function newAccount(projectName) {
  const fallback = process.env.E2E_EMAIL?.trim()
  const domain = process.env.E2E_EMAIL_DOMAIN?.trim() || fallback?.split('@')[1] || 'example.com'
  const suffix = projectName.endsWith('phone') ? 'p' : 'd'
  return { email: `e2e+${Date.now()}${suffix}@${domain}`, password: `E2e-${Date.now()}-pass` }
}

test('register, add an expense, set a budget, see both on the dashboard, log out and back in', async ({ page }, testInfo) => {
  // Stop at once if the front-end is calling an API that isn't on this machine (for
  // example VITE_API_URL pointing at the deployed one).
  const apiHosts = new Set()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/')) apiHosts.add(url.hostname)
  })

  const run = Date.now()
  const expense = { amount: '42.50', category: 'Food', description: `E2E check ${run}` }
  const amountCents = centsFrom(expense.amount)

  const account = await registerOrLogIn(page, {
    ...newAccount(testInfo.project.name),
    fallback: { email: process.env.E2E_EMAIL?.trim(), password: process.env.E2E_PASSWORD },
  })
  testInfo.annotations.push({ type: 'account', description: account.registered ? 'new account' : 'fallback account (E2E_EMAIL)' })

  await openPage(page, 'Dashboard')
  const before = await dashboardFigures(page, expense.category)
  expect([...apiHosts].every((host) => LOCAL_HOSTS.has(host)), `API requests went to ${[...apiHosts].join(', ')}`).toBe(true)
  if (account.registered) expect(before).toEqual({ income: 0, expenses: 0, net: 0, spent: 0 })

  // A limit the month's Food spending will be at 85% or so of, so the dashboard shows
  // a budget alert: $50.00 for a new account.
  const spentAfter = before.spent + amountCents
  const limitCents = Math.ceil((spentAfter * 100) / 85)
  const limit = dollarsFrom(limitCents).replace(/[$,]/g, '')

  // What the test changed, so the clean-up undoes exactly that and nothing else.
  let addedExpense = false
  let budgetChange = null
  try {
    await openPage(page, 'Transactions')
    await addExpense(page, expense)
    addedExpense = true

    await openPage(page, 'Budgets')
    budgetChange = await setBudget(page, { category: expense.category, limit })
    await expectBudgetRow(page, { category: expense.category, spentCents: spentAfter, limitCents })

    await openPage(page, 'Dashboard')
    const after = await expectDashboard(page, { before, amountCents, category: expense.category, limitCents })

    await logOut(page)
    await logIn(page, account)
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    expect(await dashboardFigures(page, expense.category)).toEqual(after)

    await openPage(page, 'Transactions')
    await expect(page.getByRole('table', { name: 'Transaction history' }).getByRole('row', { name: new RegExp(expense.description) })).toBeVisible()
    expect([...apiHosts].every((host) => LOCAL_HOSTS.has(host)), `API requests went to ${[...apiHosts].join(', ')}`).toBe(true)
  } finally {
    // Leave the account as it was: the expense goes, a limit the test added goes, and a
    // limit it changed gets its old value back. Clean-up problems don't hide the result.
    if (page.url().includes('/login')) await logIn(page, account).catch(() => {})
    if (addedExpense) {
      await openPage(page, 'Transactions').catch(() => {})
      await deleteTransaction(page, expense.description).catch(() => {})
    }
    if (budgetChange) {
      await openPage(page, 'Budgets').catch(() => {})
      if (budgetChange.hadLimit) {
        await setBudget(page, { category: expense.category, limit: budgetChange.previous }).catch(() => {})
      } else {
        await removeBudget(page, expense.category).catch(() => {})
      }
    }
  }
})
