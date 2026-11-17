// The main user flow (US-61), step by step, shared by the mocked browser tests
// (e2e/mainFlow.spec.js) and the live run against the real backend
// (e2e-live/mainFlow.live.spec.js): register, add an expense, set a budget for its
// category, and see both on the dashboard; then log out and back in.
//
// Every step finds things the way a person does, by role and label, and waits for what
// it expects to see, never for a fixed time. Figures are checked against what was there
// before the flow began, so the same steps work for a brand-new account (everything
// starts at $0.00) and for an existing one.

import { expect } from '@playwright/test'

/** Integer cents from money as the app shows it: "$1,234.56", "-$42.50" or "−$42.50". */
export function centsFrom(text) {
  const negative = /[-−]/.test(text)
  const [dollars, cents = '00'] = text.replace(/[^\d.]/g, '').split('.')
  const value = Number(dollars || '0') * 100 + Number(cents.padEnd(2, '0').slice(0, 2))
  return negative ? -value : value
}

/** Money as the app shows it, from integer cents. */
export function dollarsFrom(cents) {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const whole = String(Math.floor(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}$${whole}.${String(absolute % 100).padStart(2, '0')}`
}

// The main navigation: the sidebar on a wide screen, the menu sheet on a phone.
async function navigation(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' })
  if (await menuButton.isVisible()) {
    await menuButton.click()
    return page.getByRole('dialog', { name: 'Menu' })
  }
  return page.getByRole('navigation', { name: 'Main' })
}

/** Opens a page from the main navigation and waits for its heading. */
export async function openPage(page, linkName, heading = linkName) {
  const nav = await navigation(page)
  await nav.getByRole('link', { name: linkName }).click()
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
}

/**
 * Registers a new account. If the app says to confirm the email first (Supabase's
 * Confirm email setting is on), logs in with `fallback` instead, when it's given.
 *
 * @returns {Promise<{ email: string, password: string, registered: boolean }>}
 */
export async function registerOrLogIn(page, { email, password, fallback }) {
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  const signedIn = page.getByRole('heading', { name: 'Transactions', level: 1 })
  const confirmFirst = page.getByText('Account created. Check your email to confirm it, then log in.')
  await expect(signedIn.or(confirmFirst)).toBeVisible()
  if (await signedIn.isVisible()) return { email, password, registered: true }

  if (!fallback?.email || !fallback?.password) {
    throw new Error(
      'Supabase asks new accounts to confirm their email, so the test can’t use a new one. ' +
        'Set E2E_EMAIL and E2E_PASSWORD (an existing, confirmed account) in .env.e2e.'
    )
  }
  await page.goto('/login')
  await logIn(page, fallback)
  await expect(signedIn).toBeVisible()
  return { ...fallback, registered: false }
}

/** Logs in from the login page. */
export async function logIn(page, { email, password }) {
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

/** Logs out (from the sidebar, or the menu on a phone) and waits for the login page. */
export async function logOut(page) {
  const nav = await navigation(page)
  const scope = (await nav.getByRole('button', { name: 'Log out' }).count()) > 0 ? nav : page
  await scope.getByRole('button', { name: 'Log out' }).first().click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
}

/**
 * The dashboard's figures for this month: the summary cards, and what the spending by
 * category chart's table gives for `category`.
 */
export async function dashboardFigures(page, category) {
  const summary = page.getByRole('region', { name: 'Monthly summary' })
  const figure = async (label) =>
    centsFrom(
      await summary
        .locator('div', { has: page.getByRole('term').filter({ hasText: label }) })
        .getByRole('definition')
        .first()
        .innerText()
    )
  await expect(summary.getByRole('term').filter({ hasText: 'Total expenses' })).toBeVisible()

  // The chart's figures are in its table for screen readers: one row per category. With
  // no expenses yet the chart shows an empty state instead, so the category is at $0.00.
  const charts = page.getByRole('region', { name: 'Spending by category' })
  const table = charts.getByRole('table')
  const empty = charts.getByText(/^No expenses in /)
  await expect(table.or(empty)).toBeAttached()
  const spent = (await table.count())
    ? centsFrom(await table.getByRole('row', { name: new RegExp(`^${category}\\b`) }).getByRole('cell').innerText())
    : 0

  return {
    income: await figure('Total income'),
    expenses: await figure('Total expenses'),
    net: await figure('Net balance'),
    spent,
  }
}

/** Adds an expense from the Transactions page and waits for it to be listed. */
export async function addExpense(page, { amount, category, description }) {
  await page.getByRole('button', { name: 'Add transaction' }).click()
  const drawer = page.getByRole('dialog', { name: 'Add expense' })
  await expect(drawer).toBeVisible()
  await drawer.getByLabel('Amount ($)').fill(amount)
  await drawer.getByLabel('Category').selectOption(category)
  await drawer.getByLabel('Description (optional)').fill(description)
  await drawer.getByRole('button', { name: 'Save expense' }).click()

  await expect(drawer).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: `Expense of ${dollarsFrom(centsFrom(amount))} saved.` })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Transaction history' }).getByRole('row', { name: new RegExp(description) })).toBeVisible()
}

/**
 * Sets (or changes) a category's monthly limit on the Budgets page and waits for it.
 *
 * @returns {Promise<{ hadLimit: boolean, previous: string|null }>} Whether the category
 *   already had a limit, and what it was (as the form showed it), so it can be put back.
 */
export async function setBudget(page, { category, limit }) {
  const row = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: category, exact: true }) })
  await expect(row).toBeVisible()
  const set = row.getByRole('button', { name: `Set limit for ${category}` })
  const edit = row.getByRole('button', { name: `Edit ${category} limit` })
  await expect(set.or(edit)).toBeVisible()
  const hadLimit = await edit.isVisible()
  await (hadLimit ? edit : set).click()

  const input = row.getByLabel(`Monthly limit for ${category} ($)`)
  const previous = hadLimit ? await input.inputValue() : null
  await input.fill(limit)
  await row.getByRole('button', { name: 'Save limit' }).click()
  await expect(page.getByRole('status').filter({ hasText: `${category} limit saved: ${dollarsFrom(centsFrom(limit))} a month.` })).toBeVisible()
  return { hadLimit, previous }
}

/** The percent of a budget used, as the API works it out: rounded down. */
export function percentUsed(spentCents, limitCents) {
  return Math.floor((spentCents * 100) / limitCents)
}

/** Checks a budget row's figures and progress bar on the Budgets page. */
export async function expectBudgetRow(page, { category, spentCents, limitCents }) {
  const row = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: category, exact: true }) })
  const percent = percentUsed(spentCents, limitCents)
  await expect(row.getByText(`${dollarsFrom(spentCents)} of ${dollarsFrom(limitCents)}`)).toBeVisible()
  await expect(row.getByText(`${percent}% used`)).toBeVisible()
  await expect(row.getByRole('progressbar', { name: `${category} spending` })).toHaveAttribute('aria-valuenow', String(Math.min(percent, 100)))
}

/**
 * Checks the dashboard after the flow: the summary cards moved by the expense, the
 * budget alert shows the category's figures (when it's at 80% or more), and both charts
 * include the expense.
 */
export async function expectDashboard(page, { before, amountCents, category, limitCents }) {
  const after = await dashboardFigures(page, category)
  expect(after.expenses, 'Total expenses').toBe(before.expenses + amountCents)
  expect(after.net, 'Net balance').toBe(before.net - amountCents)
  expect(after.income, 'Total income').toBe(before.income)
  expect(after.spent, `${category} in the spending by category chart`).toBe(before.spent + amountCents)

  // The category chart is drawn, with a bar for each category.
  const categoryChart = page.getByRole('region', { name: 'Spending by category' })
  await expect(categoryChart.getByRole('table')).toBeAttached()
  await expect(categoryChart.locator('svg.recharts-surface')).toBeVisible()

  // The 6-month trend's last month (this one) includes the expense too.
  const trend = page.getByRole('region', { name: 'Spending over the last 6 months' })
  await expect(trend.getByRole('table')).toBeAttached()
  await expect(trend.locator('svg.recharts-surface')).toBeVisible()
  const thisMonth = trend.getByRole('table').getByRole('row').last()
  expect(centsFrom(await thisMonth.getByRole('cell').innerText())).toBe(after.expenses)

  // Budget alerts list categories at 80% of their limit or more.
  const spent = after.spent
  const percent = percentUsed(spent, limitCents)
  const alerts = page.getByRole('region', { name: 'Budget alerts' })
  if (percent >= 80) {
    const alert = alerts.getByRole('listitem').filter({ hasText: category })
    await expect(alert.getByText(`${dollarsFrom(spent)} of ${dollarsFrom(limitCents)}`)).toBeVisible()
    await expect(alert.getByText(spent > limitCents ? 'Over budget' : 'Close to limit')).toBeVisible()
    await expect(alert.getByRole('progressbar', { name: `${category} spending` })).toHaveAttribute('aria-valuenow', String(Math.min(percent, 100)))
  }
  return after
}

/** Deletes a transaction from the Transactions page (the live run cleans up after itself). */
export async function deleteTransaction(page, description) {
  await page.getByRole('searchbox').fill(description)
  const row = page.getByRole('table', { name: 'Transaction history' }).getByRole('row', { name: new RegExp(description) })
  await row.getByRole('button', { name: /^Actions for/ }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /^Delete/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Transaction deleted.' })).toBeVisible()
}

/** Removes a category's monthly limit from the Budgets page. */
export async function removeBudget(page, category) {
  const row = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: category, exact: true }) })
  await row.getByRole('button', { name: `Remove ${category} limit` }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^Remove/ }).click()
  await expect(page.getByRole('status').filter({ hasText: `${category} limit removed.` })).toBeVisible()
}
