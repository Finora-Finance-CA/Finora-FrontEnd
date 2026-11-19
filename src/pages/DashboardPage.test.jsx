// The Dashboard (US-41, US-42) as a user sees it. The API modules are mocked, and the
// clock is fixed at October 20th 2026, so "this month" is October 2026.

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBudgetStatus } from '../api/budgets'
import { ApiError } from '../api/client'
import { getCategorySpending, getMonthlySummary, getSpendingTrend } from '../api/summary'
import { currentSearch, renderApp } from '../test/renderApp'

vi.mock('../api/summary')
vi.mock('../api/budgets')

function summaryFor(month, { income = 0, expenses = 0, count = 0 } = {}) {
  return { month, income_cents: income, expense_cents: expenses, net_cents: income - expenses, transaction_count: count }
}

// One budget's figures, as the API works them out (US-35).
function budget(category, limit_cents, spent_cents, percent_used, status) {
  return {
    id: category,
    category,
    limit_cents,
    spent_cents,
    remaining_cents: limit_cents - spent_cents,
    percent_used,
    status,
  }
}

// Hand-worked:
//   Food: $404.87 of $500.00 is 80.97%, so 80, a warning.
//   Transportation: $173.15 of $150.00 is 115.43%, so 115, over.
//   Housing: $1,800.00 of $1,800.00 is exactly 100%, a warning.
//   Entertainment: $20.00 of $100.00 is 20%, under, so no alert.
const OCTOBER_BUDGETS = [
  budget('Food', 50000, 40487, 80, 'warning'),
  budget('Transportation', 15000, 17315, 115, 'over'),
  budget('Housing', 180000, 180000, 100, 'warning'),
  budget('Entertainment', 10000, 2000, 20, 'under'),
]

const OCTOBER_SUMMARY = summaryFor('2026-10', { income: 245000, expenses: 199886, count: 4 })

// $94.87 + $1,800.00 + $25.99 = $1,920.86.
const OCTOBER_CATEGORIES = {
  month: '2026-10',
  total_cents: 192086,
  categories: [
    { category: 'Food', spent_cents: 9487 },
    { category: 'Transportation', spent_cents: 0 },
    { category: 'Housing', spent_cents: 180000 },
    { category: 'Entertainment', spent_cents: 0 },
    { category: 'Other', spent_cents: 2599 },
  ],
}

const OCTOBER_TREND = {
  month: '2026-10',
  months: [
    { month: '2026-05', expense_cents: 0 },
    { month: '2026-06', expense_cents: 50000 },
    { month: '2026-07', expense_cents: 0 },
    { month: '2026-08', expense_cents: 125099 },
    { month: '2026-09', expense_cents: 98000 },
    { month: '2026-10', expense_cents: 192086 },
  ],
}

function card(label) {
  return screen.getByText(label, { selector: 'dt' }).closest('.summary-card')
}

function alertsPanel() {
  return screen.getByRole('region', { name: 'Budget alerts' })
}

function categoryPanel() {
  return screen.getByRole('region', { name: 'Spending by category' })
}

function trendPanel() {
  return screen.getByRole('region', { name: 'Spending over the last 6 months' })
}

async function showDashboard(path = '/dashboard') {
  renderApp(path)
  await screen.findByText('Total income')
}

beforeEach(() => {
  // Only Date is faked, so Testing Library's waits still run on real timers.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 20, 12, 0))
  getMonthlySummary.mockReset()
  getBudgetStatus.mockReset()
  getMonthlySummary.mockImplementation(async (month) => (month === '2026-10' ? OCTOBER_SUMMARY : summaryFor(month)))
  getBudgetStatus.mockImplementation(async (month) => ({
    month,
    budgets: month === '2026-10' ? OCTOBER_BUDGETS : [],
  }))
  getCategorySpending.mockReset()
  getSpendingTrend.mockReset()
  getCategorySpending.mockImplementation(async (month) => ({ month, total_cents: 0, categories: [] }))
  getSpendingTrend.mockImplementation(async (month) => ({ month, months: [] }))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('dashboard page (US-42)', () => {
  it('has a Dashboard heading and is marked as the current page in the navigation', async () => {
    await showDashboard()

    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the same summary cards as /summary for the month', async () => {
    await showDashboard()

    expect(getMonthlySummary).toHaveBeenCalledWith('2026-10')
    expect(within(card('Total income')).getByText('$2,450.00')).toBeInTheDocument()
    expect(within(card('Total expenses')).getByText('$1,998.86')).toBeInTheDocument()
    expect(within(card('Net balance')).getByText('$451.14')).toBeInTheDocument()
  })

  it('changes every panel to the chosen month and keeps it in the URL', async () => {
    await showDashboard()

    fireEvent.click(screen.getByRole('button', { name: /^Previous month/ }))

    await waitFor(() => expect(getMonthlySummary).toHaveBeenLastCalledWith('2026-09'))
    await waitFor(() => expect(getBudgetStatus).toHaveBeenLastCalledWith('2026-09'))
    expect(currentSearch()).toBe('?month=2026-09')
  })

  it('opens on the month in the URL', async () => {
    await showDashboard('/dashboard?month=2026-08')

    expect(getMonthlySummary).toHaveBeenCalledWith('2026-08')
    await waitFor(() => expect(getBudgetStatus).toHaveBeenCalledWith('2026-08'))
  })
})

describe('budget alerts panel (US-41)', () => {
  it('lists only categories at 80% or more, fullest first, with their labels', async () => {
    await showDashboard()

    const items = await within(alertsPanel()).findAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Transportation')
    expect(items[0]).toHaveTextContent('Over budget')
    expect(items[1]).toHaveTextContent('Housing')
    expect(items[1]).toHaveTextContent('Close to limit')
    expect(items[2]).toHaveTextContent('Food')
    expect(items[2]).toHaveTextContent('Close to limit')
    expect(alertsPanel()).not.toHaveTextContent('Entertainment')
  })

  it('shows spent of limit, percent used and what is left for each alert', async () => {
    await showDashboard()

    const items = await within(alertsPanel()).findAllByRole('listitem')
    expect(items[0]).toHaveTextContent('$173.15 of $150.00')
    expect(items[0]).toHaveTextContent('115% used')
    expect(items[0]).toHaveTextContent('Over by $23.15')
    expect(items[2]).toHaveTextContent('$95.13 left')
  })

  it('colours each bar to match its status', async () => {
    await showDashboard()

    await within(alertsPanel()).findAllByRole('listitem')
    expect(within(alertsPanel()).getByRole('progressbar', { name: 'Transportation spending' })).toHaveClass('progress-bar--danger')
    expect(within(alertsPanel()).getByRole('progressbar', { name: 'Housing spending' })).toHaveClass('progress-bar--warning')
  })

  it('puts a budget over by one cent above one that is exactly full, though both read 100%', async () => {
    getBudgetStatus.mockImplementation(async (month) => ({
      month,
      budgets: [
        budget('Food', 50000, 50000, 100, 'warning'),
        budget('Other', 50000, 50001, 100, 'over'),
      ],
    }))
    await showDashboard()

    const items = await within(alertsPanel()).findAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Other')
    expect(items[0]).toHaveTextContent('Over budget')
    expect(items[1]).toHaveTextContent('Food')
  })

  it('links to the Budgets page for the same month', async () => {
    await showDashboard('/dashboard?month=2026-10')

    const link = await within(alertsPanel()).findByRole('link', { name: 'Manage budgets' })
    expect(link).toHaveAttribute('href', '/budgets?month=2026-10')
  })

  it('says all budgets are on track when none has reached 80%', async () => {
    getBudgetStatus.mockImplementation(async (month) => ({
      month,
      budgets: [budget('Entertainment', 10000, 2000, 20, 'under')],
    }))
    await showDashboard()

    expect(await within(alertsPanel()).findByText('All budgets on track')).toBeInTheDocument()
    expect(alertsPanel()).toHaveTextContent('No category has reached 80% of its limit in October 2026.')
  })

  it('offers to set a limit when there are no budgets at all', async () => {
    getBudgetStatus.mockImplementation(async (month) => ({ month, budgets: [] }))
    await showDashboard()

    expect(await within(alertsPanel()).findByText('No budgets yet')).toBeInTheDocument()
    expect(within(alertsPanel()).getByRole('link', { name: 'Set a limit' })).toHaveAttribute('href', '/budgets')
  })

  it('shows an error with Try again when the alerts do not load, and Try again loads them', async () => {
    getBudgetStatus.mockRejectedValueOnce(
      new ApiError('network', "We couldn't reach the server. Check your connection and try again.")
    )
    await showDashboard()

    expect(
      await within(alertsPanel()).findByText("We couldn't load your budgets for October 2026.", { exact: false })
    ).toBeInTheDocument()
    fireEvent.click(within(alertsPanel()).getByRole('button', { name: 'Try again' }))

    expect(await within(alertsPanel()).findByText('Transportation')).toBeInTheDocument()
    expect(getBudgetStatus).toHaveBeenCalledTimes(2)
  })

  it('offers Sign in again, not Try again, when the session has ended', async () => {
    getBudgetStatus.mockRejectedValue(new ApiError('unauthorized', 'Your session has ended. Sign in again.', { status: 401 }))
    await showDashboard()

    expect(await within(alertsPanel()).findByRole('link', { name: 'Sign in again.' })).toBeInTheDocument()
    expect(within(alertsPanel()).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})

describe('spending by category (US-43)', () => {
  beforeEach(() => {
    getCategorySpending.mockImplementation(async (month) =>
      month === '2026-10' ? OCTOBER_CATEGORIES : { month, total_cents: 0, categories: [] }
    )
  })

  it('lists every category with what was spent, and the total, for screen readers', async () => {
    await showDashboard()

    const table = await within(categoryPanel()).findByRole('table', { name: 'Spending by category in October 2026' })
    const rows = within(table).getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(rows).toEqual([
      'Food$94.87',
      'Transportation$0.00',
      'Housing$1,800.00',
      'Entertainment$0.00',
      'Other$25.99',
      'Total$1,920.86',
    ])
  })

  it('loads the chosen month', async () => {
    await showDashboard()

    fireEvent.click(screen.getByRole('button', { name: /^Previous month/ }))

    await waitFor(() => expect(getCategorySpending).toHaveBeenLastCalledWith('2026-09'))
  })

  it('says so for a month with no expenses, with a link to add one', async () => {
    await showDashboard('/dashboard?month=2026-08')

    expect(await within(categoryPanel()).findByText('No expenses in August 2026')).toBeInTheDocument()
    expect(within(categoryPanel()).getByRole('link', { name: 'Add an expense' })).toHaveAttribute('href', '/transactions')
  })

  it('shows an error with Try again, and Try again loads it', async () => {
    getCategorySpending.mockRejectedValueOnce(
      new ApiError('network', "We couldn't reach the server. Check your connection and try again.")
    )
    await showDashboard()

    expect(
      await within(categoryPanel()).findByText("We couldn't load your spending for October 2026.", { exact: false })
    ).toBeInTheDocument()
    fireEvent.click(within(categoryPanel()).getByRole('button', { name: 'Try again' }))

    expect(await within(categoryPanel()).findByRole('table')).toBeInTheDocument()
    expect(getCategorySpending).toHaveBeenCalledTimes(2)
  })
})

describe('spending over the last 6 months (US-44)', () => {
  beforeEach(() => {
    getSpendingTrend.mockImplementation(async (month) => (month === '2026-10' ? OCTOBER_TREND : { month, months: [
      { month: '2026-04', expense_cents: 0 },
      { month: '2026-05', expense_cents: 0 },
      { month: '2026-06', expense_cents: 0 },
      { month: '2026-07', expense_cents: 0 },
      { month: '2026-08', expense_cents: 0 },
      { month: '2026-09', expense_cents: 0 },
    ] }))
  })

  it('lists each of the 6 months, oldest first, with what was spent, for screen readers', async () => {
    await showDashboard()

    const table = await within(trendPanel()).findByRole('table', { name: 'Spending from May 2026 to October 2026' })
    const rows = within(table).getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(rows).toEqual([
      'May 2026$0.00',
      'June 2026$500.00',
      'July 2026$0.00',
      'August 2026$1,250.99',
      'September 2026$980.00',
      'October 2026$1,920.86',
    ])
  })

  it('loads the 6 months ending at the chosen month', async () => {
    await showDashboard()

    fireEvent.click(screen.getByRole('button', { name: /^Previous month/ }))

    await waitFor(() => expect(getSpendingTrend).toHaveBeenLastCalledWith('2026-09'))
  })

  it('says so when there were no expenses in any of the 6 months, with a link to add one', async () => {
    await showDashboard('/dashboard?month=2026-09')

    expect(await within(trendPanel()).findByText('No expenses in the last 6 months')).toBeInTheDocument()
    expect(within(trendPanel()).getByRole('link', { name: 'Add an expense' })).toHaveAttribute('href', '/transactions')
  })

  it('shows an error with Try again, and Try again loads it', async () => {
    getSpendingTrend.mockRejectedValueOnce(
      new ApiError('network', "We couldn't reach the server. Check your connection and try again.")
    )
    await showDashboard()

    expect(
      await within(trendPanel()).findByText("We couldn't load your spending over the last 6 months.", { exact: false })
    ).toBeInTheDocument()
    fireEvent.click(within(trendPanel()).getByRole('button', { name: 'Try again' }))

    expect(await within(trendPanel()).findByRole('table')).toBeInTheDocument()
    expect(getSpendingTrend).toHaveBeenCalledTimes(2)
  })
})
