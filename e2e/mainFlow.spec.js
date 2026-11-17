// US-61: the main flow in a browser, end to end, against the mocked API and Supabase
// (e2e/support): register, add an expense, set a budget, and see both on the dashboard
// (amounts, budget progress, charts); then log out, log back in and find it all still
// there. Once on a desktop and once on a 375px phone. The steps are in flows/mainFlow.js,
// shared with the live run (npm run e2e:live).
//
// The mock keeps an account per user, so the new account starts empty and only ever sees
// its own data; the clock is fixed at 15 November 2026.

import {
  addExpense,
  dashboardFigures,
  deleteTransaction,
  expectBudgetRow,
  expectDashboard,
  logIn,
  logOut,
  openPage,
  registerOrLogIn,
  removeBudget,
  setBudget,
} from './flows/mainFlow.js'
import { expect, test } from './support/test.js'

const ACCOUNT = { email: 'new.user@example.com', password: 'a-strong-password' }
const EXPENSE = { amount: '42.50', category: 'Food', description: 'E2E groceries' }
const LIMIT = '50.00'

for (const [device, use] of [
  ['desktop', { viewport: { width: 1280, height: 900 } }],
  ['phone (375px)', { viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true }],
]) {
  test.describe(`on a ${device}`, () => {
    test.use({ signedIn: false, ...use })

    test('register, add an expense, set a budget, and see both on the dashboard; then log out and back in', async ({ page, backend }) => {
      // Register: a new account, with nothing in it yet.
      const account = await registerOrLogIn(page, ACCOUNT)
      expect(account.registered).toBe(true)
      await expect(page.getByText("You haven't added any transactions yet.")).toBeVisible()

      await openPage(page, 'Dashboard')
      const before = await dashboardFigures(page, EXPENSE.category)
      expect(before).toEqual({ income: 0, expenses: 0, net: 0, spent: 0 })

      // Add an expense.
      await openPage(page, 'Transactions')
      await addExpense(page, EXPENSE)
      const row = page.getByRole('table', { name: 'Transaction history' }).getByRole('row', { name: /E2E groceries/ })
      await expect(row).toContainText('$42.50')
      await expect(row).toContainText('Food')
      await expect(row).toContainText('Nov 15, 2026')

      // Set a budget for its category: $42.50 of $50.00 is 85%, close to the limit.
      await openPage(page, 'Budgets')
      expect(await setBudget(page, { category: 'Food', limit: LIMIT })).toEqual({ hadLimit: false, previous: null })
      await expectBudgetRow(page, { category: 'Food', spentCents: 4250, limitCents: 5000 })
      await expect(
        page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Food', exact: true }) }).getByText('Close to limit')
      ).toBeVisible()

      // The dashboard reflects both.
      await openPage(page, 'Dashboard')
      const after = await expectDashboard(page, { before, amountCents: 4250, category: 'Food', limitCents: 5000 })
      expect(after).toEqual({ income: 0, expenses: 4250, net: -4250, spent: 4250 })

      // What the app sent, as the API received it.
      const saved = [...backend.accounts.values()].find(({ user }) => user.email === ACCOUNT.email)
      expect(saved.transactions).toEqual([
        expect.objectContaining({ amount_cents: 4250, category: 'Food', type: 'expense', description: 'E2E groceries', date: '2026-11-15' }),
      ])
      expect(saved.budgets).toEqual([expect.objectContaining({ category: 'Food', limit_cents: 5000 })])

      // Log out, then back in: back on the dashboard, where they were, with everything
      // still there.
      await logOut(page)
      await expect(page.getByText('E2E groceries')).toHaveCount(0)
      await logIn(page, ACCOUNT)
      await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
      expect(await dashboardFigures(page, 'Food')).toEqual(after)

      await openPage(page, 'Transactions')
      await expect(page.getByRole('table', { name: 'Transaction history' }).getByRole('row', { name: /E2E groceries/ })).toBeVisible()

      await openPage(page, 'Budgets')
      await expectBudgetRow(page, { category: 'Food', spentCents: 4250, limitCents: 5000 })

      await openPage(page, 'Dashboard')
      expect(await expectDashboard(page, { before, amountCents: 4250, category: 'Food', limitCents: 5000 })).toEqual(after)
    })
  })
}

test.describe('logging back in', () => {
  test.use({ signedIn: false })

  test('with the wrong password is refused, and the account’s data stays private', async ({ page }) => {
    await registerOrLogIn(page, ACCOUNT)
    await addExpense(page, EXPENSE)
    await logOut(page)

    await logIn(page, { email: ACCOUNT.email, password: 'not-the-password' })

    await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.')
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
    await expect(page.getByText('E2E groceries')).toHaveCount(0)
  })

  test('as someone else shows only their own data, not the new account’s', async ({ page }) => {
    await registerOrLogIn(page, ACCOUNT)
    await addExpense(page, EXPENSE)
    await logOut(page)

    // The fixtures' user: six months of their own transactions.
    await logIn(page, { email: 'sam@example.com', password: 'any-password' })

    await expect(page.getByRole('table', { name: 'Transaction history' }).getByRole('row', { name: /Freelance design work/ })).toBeVisible()
    await expect(page.getByText('E2E groceries')).toHaveCount(0)
  })
})

// The path the live run (npm run e2e:live) takes when Supabase asks new accounts to
// confirm their email: log in to an existing account that already has data and a Food
// limit, check everything against the figures that were there before, then clean up.
test.describe('when new accounts must confirm their email (the live run’s fallback)', () => {
  test.use({ signedIn: false, backendOptions: { confirmEmail: true } })

  test('logs in to the fallback account, checks against its own figures, and leaves it as it was', async ({ page, backend }) => {
    const fixtures = { transactions: backend.transactions.length, budgets: structuredClone(backend.budgets) }
    const account = await registerOrLogIn(page, {
      email: 'e2e+1@example.com',
      password: 'a-strong-password',
      fallback: { email: 'sam@example.com', password: 'any-password' },
    })
    expect(account).toEqual({ email: 'sam@example.com', password: 'any-password', registered: false })

    await openPage(page, 'Dashboard')
    const before = await dashboardFigures(page, 'Food')
    expect(before.spent).toBe(35240)
    const spentAfter = before.spent + 4250
    const limitCents = Math.ceil((spentAfter * 100) / 85)

    await openPage(page, 'Transactions')
    await addExpense(page, { amount: '42.50', category: 'Food', description: 'E2E check 1' })
    await openPage(page, 'Budgets')
    const change = await setBudget(page, { category: 'Food', limit: (limitCents / 100).toFixed(2) })
    expect(change).toEqual({ hadLimit: true, previous: '400.00' })
    await expectBudgetRow(page, { category: 'Food', spentCents: spentAfter, limitCents })
    await openPage(page, 'Dashboard')
    await expectDashboard(page, { before, amountCents: 4250, category: 'Food', limitCents })

    // The live run's clean-up.
    await openPage(page, 'Transactions')
    await deleteTransaction(page, 'E2E check 1')
    await openPage(page, 'Budgets')
    await setBudget(page, { category: 'Food', limit: change.previous })

    expect(backend.transactions).toHaveLength(fixtures.transactions)
    expect(backend.budgets.map(({ category, limit_cents }) => ({ category, limit_cents }))).toEqual(
      fixtures.budgets.map(({ category, limit_cents }) => ({ category, limit_cents }))
    )
  })

  test('removes a limit it added', async ({ page }) => {
    await registerOrLogIn(page, {
      email: 'e2e+2@example.com',
      password: 'a-strong-password',
      fallback: { email: 'sam@example.com', password: 'any-password' },
    })
    await openPage(page, 'Budgets')
    expect(await setBudget(page, { category: 'Other', limit: '75.00' })).toEqual({ hadLimit: false, previous: null })

    await removeBudget(page, 'Other')

    await expect(
      page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Other', exact: true }) }).getByText('No limit set')
    ).toBeVisible()
  })
})
