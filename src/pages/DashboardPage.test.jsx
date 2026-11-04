// The Dashboard (US-41, US-42) as a user sees it. The API modules are mocked, and the
// clock is fixed at October 20th 2026, so "this month" is October 2026.

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBudgetStatus } from '../api/budgets'
import { ApiError } from '../api/client'
import { getMonthlySummary } from '../api/summary'
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

function card(label) {
  return screen.getByText(label, { selector: 'dt' }).closest('.summary-card')
}

function alertsPanel() {
  return screen.getByRole('region', { name: 'Budget alerts' })
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
