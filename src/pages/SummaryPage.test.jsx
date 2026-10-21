// The Summary page (US-28, US-29) as a user sees it. The API module is mocked, and the
// clock is fixed at October 20th 2026, so "this month" is October 2026.

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { getMonthlySummary } from '../api/summary'
import { currentSearch, renderApp } from '../test/renderApp'

vi.mock('../api/summary')

function summaryFor(month, { income = 0, expenses = 0, count = 0 } = {}) {
  return { month, income_cents: income, expense_cents: expenses, net_cents: income - expenses, transaction_count: count }
}

const OCTOBER = summaryFor('2026-10', { income: 245000, expenses: 199886, count: 4 })

function deferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function card(label) {
  return screen.getByText(label, { selector: 'dt' }).closest('.summary-card')
}

function monthLabel() {
  return screen.getByRole('group', { name: 'Choose a month' }).querySelector('.month-selector__label')
}

async function showSummary(path = '/summary') {
  renderApp(path)
  await screen.findByText('Total income')
}

beforeEach(() => {
  // Only Date is faked, so Testing Library's waits still run on real timers.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 20, 12, 0))
  getMonthlySummary.mockReset()
  getMonthlySummary.mockImplementation(async (month) => (month === '2026-10' ? OCTOBER : summaryFor(month)))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('month selector (US-28)', () => {
  it('starts on the user’s current month', async () => {
    await showSummary()

    expect(getMonthlySummary).toHaveBeenCalledWith('2026-10')
    expect(monthLabel()).toHaveTextContent('October 2026')
    expect(screen.getByRole('heading', { name: 'Monthly summary', level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'This month' })).not.toBeInTheDocument()
  })

  it('announces the month name when it changes', async () => {
    await showSummary()

    expect(monthLabel()).toHaveAttribute('aria-live', 'polite')
  })

  it('names Previous and Next with the month they go to', async () => {
    await showSummary()

    expect(screen.getByRole('button', { name: 'Previous month, September 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month, November 2026' })).toBeInTheDocument()
  })

  it('Previous shows the month before and puts it in the URL', async () => {
    await showSummary()

    fireEvent.click(screen.getByRole('button', { name: /^Previous month/ }))

    expect(await screen.findByText('September 2026')).toBeInTheDocument()
    expect(getMonthlySummary).toHaveBeenLastCalledWith('2026-09')
    expect(currentSearch()).toBe('?month=2026-09')
  })

  it('Next goes from December to January of the next year', async () => {
    await showSummary('/summary?month=2026-12')

    fireEvent.click(screen.getByRole('button', { name: /^Next month/ }))

    expect(await screen.findByText('January 2027')).toBeInTheDocument()
    expect(getMonthlySummary).toHaveBeenLastCalledWith('2027-01')
    expect(currentSearch()).toBe('?month=2027-01')
  })

  it('opens the month given in the URL', async () => {
    await showSummary('/summary?month=2025-02')

    expect(getMonthlySummary).toHaveBeenCalledWith('2025-02')
    expect(monthLabel()).toHaveTextContent('February 2025')
  })

  it.each(['2026-13', 'abc', '1899-12', '2026-1', ''])('falls back to the current month for ?month=%s', async (month) => {
    await showSummary(`/summary?month=${month}`)

    expect(getMonthlySummary).toHaveBeenCalledWith('2026-10')
    expect(getMonthlySummary).toHaveBeenCalledTimes(1)
    expect(monthLabel()).toHaveTextContent('October 2026')
  })

  it('offers This month when another month is showing, which goes back and clears the URL', async () => {
    await showSummary('/summary?month=2026-03')

    fireEvent.click(screen.getByRole('button', { name: 'This month' }))

    expect(await screen.findByText('October 2026')).toBeInTheDocument()
    expect(currentSearch()).toBe('')
    expect(screen.queryByRole('button', { name: 'This month' })).not.toBeInTheDocument()
  })

  it('stops Previous at January 1900, the earliest month the API accepts', async () => {
    await showSummary('/summary?month=1900-01')

    expect(screen.getByRole('button', { name: /^Previous month/ })).toBeDisabled()
  })

  it('keeps the last month’s cards, dimmed, while the next one loads', async () => {
    await showSummary()
    const next = deferred()
    getMonthlySummary.mockReturnValueOnce(next.promise)

    fireEvent.click(screen.getByRole('button', { name: /^Next month/ }))

    expect(await screen.findByText('November 2026')).toBeInTheDocument()
    expect(within(card('Total income')).getByText('$2,450.00')).toBeInTheDocument()
    expect(screen.getByText('Total income').closest('dl')).toHaveAttribute('aria-busy', 'true')

    await act(async () => next.resolve(summaryFor('2026-11', { income: 100, count: 1 })))
    expect(within(card('Total income')).getByText('$1.00')).toBeInTheDocument()
  })
})

describe('summary cards (US-29)', () => {
  it('shows a loading message while the summary loads', async () => {
    getMonthlySummary.mockReturnValue(deferred().promise)
    renderApp('/summary')

    expect(await screen.findByText('Loading summary…')).toBeInTheDocument()
    // Three placeholder cards hold the layout; screen readers skip them.
    const placeholders = document.querySelector('.summary-cards[aria-hidden="true"]')
    expect(placeholders.querySelectorAll('.summary-card')).toHaveLength(3)
    expect(screen.queryByText('Total income')).not.toBeInTheDocument()
  })

  it('shows total income, total expenses and net balance as dollars', async () => {
    await showSummary()

    expect(within(card('Total income')).getByText('$2,450.00')).toBeInTheDocument()
    expect(within(card('Total expenses')).getByText('$1,998.86')).toBeInTheDocument()
    expect(within(card('Net balance')).getByText('$451.14')).toBeInTheDocument()
    expect(card('Net balance')).toHaveTextContent('Surplus. You earned more than you spent.')
    expect(card('Net balance')).not.toHaveClass('summary-card--deficit')
    expect(screen.getByText('Based on 4 transactions in October 2026.')).toBeInTheDocument()
  })

  it('shows a negative net in red, with a minus sign and the word Deficit', async () => {
    getMonthlySummary.mockResolvedValue(summaryFor('2026-10', { income: 68540, expenses: 104238, count: 4 }))
    await showSummary()

    const net = card('Net balance')
    expect(within(net).getByText('-$356.98')).toBeInTheDocument()
    expect(net).toHaveTextContent('Deficit. You spent more than you earned.')
    expect(net).toHaveClass('summary-card--deficit')
  })

  it('says Even when income and expenses match', async () => {
    getMonthlySummary.mockResolvedValue(summaryFor('2026-10', { income: 5000, expenses: 5000, count: 2 }))
    await showSummary()

    expect(card('Net balance')).toHaveTextContent('$0.00')
    expect(card('Net balance')).toHaveTextContent('Even.')
  })

  it('says so for a month with no transactions, with a link to add one', async () => {
    await showSummary('/summary?month=2026-08')

    expect(screen.getByText('No transactions in August 2026.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add a transaction' })).toHaveAttribute('href', '/transactions')
    expect(within(card('Total income')).getByText('$0.00')).toBeInTheDocument()
  })

  it('uses "transaction" for a month with just one', async () => {
    getMonthlySummary.mockResolvedValue(summaryFor('2026-10', { expenses: 1250, count: 1 }))
    await showSummary()

    expect(screen.getByText('Based on 1 transaction in October 2026.')).toBeInTheDocument()
  })

  it('shows an error with Try again, which loads the summary again', async () => {
    getMonthlySummary.mockRejectedValueOnce(
      new ApiError('network', "We couldn't reach the server. Check your connection and try again.")
    )
    renderApp('/summary')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't load the summary for October 2026. We couldn't reach the server. Check your connection and try again."
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Total income')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getMonthlySummary).toHaveBeenCalledTimes(2)
  })

  it('never shows the raw text of an unexpected error', async () => {
    getMonthlySummary.mockRejectedValue(new TypeError("Cannot read properties of undefined (reading 'net_cents')"))
    renderApp('/summary')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong. Please try again.')
    expect(alert).not.toHaveTextContent('Cannot read')
  })

  it('offers Sign in again, not Try again, when the session has ended', async () => {
    getMonthlySummary.mockRejectedValue(new ApiError('unauthorized', 'Your session has ended. Sign in again.', { status: 401 }))
    renderApp('/summary')

    expect(await screen.findByRole('link', { name: 'Sign in again.' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
