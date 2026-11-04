// The Budgets page's spending figures (US-36, US-37) and how they stay current (US-38).
// The API modules are mocked, and the clock is fixed at October 20th 2026, so "this
// month" is October 2026. The limit forms themselves are in BudgetsPage.test.jsx.

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBudgetStatus, listBudgets, updateBudget } from '../api/budgets'
import { ApiError } from '../api/client'
import { createTransaction } from '../api/transactions'
import { currentSearch, renderApp } from '../test/renderApp'
import { savedFrom } from '../test/transactions'

vi.mock('../api/budgets')
vi.mock('../api/transactions')

const FOOD = { id: '7', category: 'Food', limit_cents: 50000 }
const TRANSPORTATION = { id: '8', category: 'Transportation', limit_cents: 15000 }
const HOUSING = { id: '9', category: 'Housing', limit_cents: 180000 }

const status = (budget, spent_cents, percent_used, state) => ({
  ...budget,
  spent_cents,
  remaining_cents: budget.limit_cents - spent_cents,
  percent_used,
  status: state,
})

// Hand-worked, as the API works them out:
//   Food: $12.50 + $82.37 + $310.00 = $404.87 of $500.00, 80.97% so 80, $95.13 left.
//   Transportation: $173.15 of $150.00, 115.43% so 115, $23.15 over.
//   Housing: $1,800.00 of $1,800.00, exactly 100%, $0.00 left.
const OCTOBER = [
  status(FOOD, 40487, 80, 'warning'),
  status(TRANSPORTATION, 17315, 115, 'over'),
  status(HOUSING, 180000, 100, 'warning'),
]

const SERVER_ERROR = new ApiError('server', 'Something went wrong on our end. Please try again in a moment.')

function rowFor(category) {
  const list = screen.getByRole('main').querySelector('.budget-list')
  return within(list).getByRole('heading', { name: category }).closest('li')
}

function barFor(category) {
  return within(rowFor(category)).getByRole('progressbar', { name: `${category} spending` })
}

async function showBudgets(path = '/budgets') {
  renderApp(path)
  await screen.findByRole('progressbar', { name: 'Food spending' })
}

beforeEach(() => {
  // Only Date is faked, so Testing Library's waits still run on real timers.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 20, 12, 0))
  for (const mock of [getBudgetStatus, listBudgets, updateBudget, createTransaction]) mock.mockReset()
  listBudgets.mockResolvedValue([FOOD, TRANSPORTATION, HOUSING])
  getBudgetStatus.mockImplementation(async (month) => ({ month, budgets: month === '2026-10' ? OCTOBER : [] }))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('spent against each limit (US-36)', () => {
  it('shows spent of limit, a progress bar and the percent used for each budgeted row', async () => {
    await showBudgets()

    expect(getBudgetStatus).toHaveBeenCalledWith('2026-10')
    expect(rowFor('Food')).toHaveTextContent('$404.87 of $500.00')
    expect(rowFor('Food')).toHaveTextContent('80% used')
    expect(barFor('Food')).toHaveAttribute('aria-valuenow', '80')
    expect(barFor('Food')).toHaveAttribute('aria-valuetext', '80% used, $95.13 left')
    expect(screen.getByText('Spending in October 2026. Limits apply to every month.')).toBeInTheDocument()
  })

  it('fills the bar no further than 100% when over the limit, while the text shows the real percent', async () => {
    await showBudgets()

    const bar = barFor('Transportation')
    expect(rowFor('Transportation')).toHaveTextContent('$173.15 of $150.00')
    expect(rowFor('Transportation')).toHaveTextContent('115% used')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(bar).toHaveAttribute('aria-valuetext', '115% used, Over by $23.15')
    expect(bar.querySelector('.progress-bar__fill').style.getPropertyValue('--progress')).toBe('1')
  })

  it('leaves rows without a limit as they were, with no bar', async () => {
    await showBudgets()

    expect(rowFor('Entertainment')).toHaveTextContent('No limit set')
    expect(within(rowFor('Entertainment')).queryByRole('progressbar')).not.toBeInTheDocument()
    expect(within(rowFor('Entertainment')).queryByRole('button', { name: /Add expense/ })).not.toBeInTheDocument()
  })
})

describe('budget alerts (US-39, US-40)', () => {
  it('colours a budget at 80% or more of its limit as a warning, with a label', async () => {
    await showBudgets()

    expect(barFor('Food')).toHaveClass('progress-bar--warning')
    expect(rowFor('Food')).toHaveTextContent('Close to limit')
  })

  it('treats exactly 100% as a warning, not over', async () => {
    await showBudgets()

    expect(barFor('Housing')).toHaveClass('progress-bar--warning')
    expect(rowFor('Housing')).toHaveTextContent('Close to limit')
    expect(rowFor('Housing')).not.toHaveTextContent('Over budget')
  })

  it('colours a budget above its limit as over, with a label', async () => {
    await showBudgets()

    expect(barFor('Transportation')).toHaveClass('progress-bar--danger')
    expect(rowFor('Transportation')).toHaveTextContent('Over budget')
    expect(rowFor('Transportation')).not.toHaveTextContent('Close to limit')
  })

  it('shows no alert for a budget under 80% of its limit', async () => {
    // $200.00 of $500.00 is 40%.
    getBudgetStatus.mockImplementation(async (month) => ({
      month,
      budgets: [status(FOOD, 20000, 40, 'under')],
    }))
    await showBudgets()

    expect(barFor('Food')).toHaveClass('progress-bar--default')
    expect(rowFor('Food')).not.toHaveTextContent('Close to limit')
    expect(rowFor('Food')).not.toHaveTextContent('Over budget')
  })

  it('updates the alert when an expense takes a budget over its limit', async () => {
    await showBudgets()
    createTransaction.mockImplementation(async (payload) => savedFrom(payload))
    // After the save, Food has $100.00 more: $504.87 of $500.00, 100% (rounded down), over by $4.87.
    getBudgetStatus.mockImplementation(async (month) => ({
      month,
      budgets: [status(FOOD, 50487, 100, 'over'), ...OCTOBER.slice(1)],
    }))

    fireEvent.click(within(rowFor('Food')).getByRole('button', { name: 'Add expense to Food' }))
    const drawer = await screen.findByRole('dialog', { name: 'Add expense' })
    fireEvent.change(within(drawer).getByLabelText('Amount ($)'), { target: { value: '100' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save expense' }))

    await waitFor(() => expect(barFor('Food')).toHaveClass('progress-bar--danger'))
    expect(rowFor('Food')).toHaveTextContent('Over budget')
    // Over by one cent or more still reads 100% used; only the status tells it apart.
    expect(rowFor('Food')).toHaveTextContent('100% used')
  })
})

describe('what is left (US-37)', () => {
  it.each([
    ['Food', '$95.13 left'],
    ['Transportation', 'Over by $23.15'],
    ['Housing', '$0.00 left'],
  ])('shows %s as "%s"', async (category, text) => {
    await showBudgets()

    expect(rowFor(category).querySelector('.budget-row__remaining')).toHaveTextContent(text)
  })
})

describe('month selector', () => {
  it('loads the figures for another month and keeps it in the URL', async () => {
    await showBudgets()

    fireEvent.click(screen.getByRole('button', { name: 'Previous month, September 2026' }))

    await waitFor(() => expect(getBudgetStatus).toHaveBeenLastCalledWith('2026-09'))
    expect(currentSearch()).toBe('?month=2026-09')
    // No spending in September: the rows show just their limits again.
    await waitFor(() => expect(within(rowFor('Food')).queryByRole('progressbar')).not.toBeInTheDocument())
    expect(rowFor('Food')).toHaveTextContent('$500.00 a month')
  })

  it('opens on the month in the URL', async () => {
    getBudgetStatus.mockImplementation(async (month) => ({ month, budgets: OCTOBER }))
    await showBudgets('/budgets?month=2026-08')

    expect(getBudgetStatus).toHaveBeenCalledWith('2026-08')
    expect(screen.getByText('Spending in August 2026. Limits apply to every month.')).toBeInTheDocument()
  })

  it('keeps the rows on screen while another month loads', async () => {
    await showBudgets()
    getBudgetStatus.mockReturnValue(new Promise(() => {}))

    fireEvent.click(screen.getByRole('button', { name: 'Next month, November 2026' }))

    await waitFor(() => expect(getBudgetStatus).toHaveBeenLastCalledWith('2026-11'))
    expect(rowFor('Food')).toHaveTextContent('$404.87 of $500.00')
    expect(screen.getByRole('main').querySelector('.budget-list').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
  })
})

describe('keeping the figures current (US-38)', () => {
  it('adds an expense from a row, with that category chosen, and the row updates in place', async () => {
    await showBudgets()
    createTransaction.mockImplementation(async (payload) => savedFrom(payload))
    // After the save, Food has $12.50 more: $417.37 of $500.00, 83%, $82.63 left.
    getBudgetStatus.mockImplementation(async (month) => ({
      month,
      budgets: [status(FOOD, 41737, 83, 'warning'), ...OCTOBER.slice(1)],
    }))

    fireEvent.click(within(rowFor('Food')).getByRole('button', { name: 'Add expense to Food' }))
    const drawer = await screen.findByRole('dialog', { name: 'Add expense' })
    expect(within(drawer).getByLabelText('Category')).toHaveValue('Food')
    fireEvent.change(within(drawer).getByLabelText('Amount ($)'), { target: { value: '12.50' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save expense' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'expense', category: 'Food', amount_cents: 1250 }))
    expect(screen.getByText('Expense of $12.50 saved.')).toBeInTheDocument()
    await waitFor(() => expect(rowFor('Food')).toHaveTextContent('$417.37 of $500.00'))
    await waitFor(() => expect(getBudgetStatus).toHaveBeenCalledTimes(2))
    expect(rowFor('Food').querySelector('.budget-row__remaining')).toHaveTextContent('$82.63 left')
  })

  it('loads the figures again when the tab is shown again', async () => {
    await showBudgets()
    expect(getBudgetStatus).toHaveBeenCalledTimes(1)

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(getBudgetStatus).toHaveBeenCalledTimes(2))
  })

  it('loads the figures again after a limit changes, showing the plain limit until they arrive', async () => {
    await showBudgets()
    updateBudget.mockResolvedValue({ ...FOOD, limit_cents: 60000 })
    let answer
    getBudgetStatus.mockReturnValue(new Promise((resolve) => (answer = resolve)))

    fireEvent.click(within(rowFor('Food')).getByRole('button', { name: 'Edit Food limit' }))
    fireEvent.change(within(rowFor('Food')).getByLabelText('Monthly limit for Food ($)'), { target: { value: '600' } })
    fireEvent.click(within(rowFor('Food')).getByRole('button', { name: 'Save limit' }))

    // The old figures were for a $500.00 limit, so they aren't shown against $600.00.
    await waitFor(() => expect(rowFor('Food')).toHaveTextContent('$600.00 a month'))
    expect(within(rowFor('Food')).queryByRole('progressbar')).not.toBeInTheDocument()
    await waitFor(() => expect(getBudgetStatus).toHaveBeenCalledTimes(2))

    // $404.87 of $600.00 is 67.48%, so 67, $195.13 left.
    act(() => answer({ month: '2026-10', budgets: [status({ ...FOOD, limit_cents: 60000 }, 40487, 67, 'under')] }))

    await waitFor(() => expect(rowFor('Food')).toHaveTextContent('$404.87 of $600.00'))
    expect(rowFor('Food').querySelector('.budget-row__remaining')).toHaveTextContent('$195.13 left')
  })
})

describe('errors', () => {
  it('shows an error with Try again when the figures do not load, and Try again loads them', async () => {
    getBudgetStatus.mockRejectedValueOnce(SERVER_ERROR)
    renderApp('/budgets')

    expect(await screen.findByText("We couldn't load your spending for October 2026.", { exact: false })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('progressbar', { name: 'Food spending' })).toBeInTheDocument()
    await waitFor(() => expect(getBudgetStatus).toHaveBeenCalledTimes(2))
    expect(listBudgets).toHaveBeenCalledTimes(1)
  })
})
