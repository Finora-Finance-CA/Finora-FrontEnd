// US-57 across the whole app: a broken page keeps the navigation, an expired session
// goes to the login page with a reason, a session that can't be read never leaves a
// spinner, and a slow server says it may be waking up.

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reportSessionExpired, trackRequest } from './api/requestEvents'
import { listBudgets, getBudgetStatus } from './api/budgets'
import { listTransactions } from './api/transactions'
import { fakeAuth } from './test/fakeSupabase'
import { currentPath, renderApp } from './test/renderApp'
import { pageOf } from './test/transactions'

vi.mock('./api/budgets')
vi.mock('./api/transactions')
// The Summary page stands in for any page that breaks while it renders.
vi.mock('./pages/SummaryPage', () => ({
  default: function BrokenPage() {
    throw new Error('Cannot read properties of undefined (reading "income_cents")')
  },
}))

beforeEach(() => {
  listBudgets.mockReset().mockResolvedValue([])
  getBudgetStatus.mockReset().mockImplementation(async (month) => ({ month, budgets: [] }))
  listTransactions.mockReset().mockResolvedValue(pageOf([]))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a page that breaks', () => {
  it('shows a message with Try again inside the app shell, and the navigation still works', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp('/summary')

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText(/income_cents/)).not.toBeInTheDocument()

    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]
    fireEvent.click(within(nav).getByRole('link', { name: 'Budgets' }))

    expect(await screen.findByRole('heading', { name: 'Budgets', level: 1 })).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})

describe('an expired session', () => {
  it('signs out and opens the login page, saying why', async () => {
    renderApp('/budgets')
    await screen.findByRole('heading', { name: 'Budgets', level: 1 })

    await act(async () => reportSessionExpired())

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(currentPath()).toBe('/login')
    expect(screen.getByText('Your session expired, please log in again.')).toBeInTheDocument()
    expect(fakeAuth.signOut).toHaveBeenCalledTimes(1)
  })

  it('signs out only once when several requests fail at the same time', async () => {
    renderApp('/budgets')
    await screen.findByRole('heading', { name: 'Budgets', level: 1 })

    await act(async () => {
      reportSessionExpired()
      reportSessionExpired()
      reportSessionExpired()
    })

    await screen.findByRole('heading', { name: 'Log in' })
    expect(fakeAuth.signOut).toHaveBeenCalledTimes(1)
  })

  it('brings the user back to the same page after logging in, and drops the message', async () => {
    renderApp('/budgets')
    await screen.findByRole('heading', { name: 'Budgets', level: 1 })
    await act(async () => reportSessionExpired())
    await screen.findByRole('heading', { name: 'Log in' })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'me@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('heading', { name: 'Budgets', level: 1 })).toBeInTheDocument()
    expect(currentPath()).toBe('/budgets')
    expect(screen.queryByText('Your session expired, please log in again.')).not.toBeInTheDocument()
  })

  it('is not mentioned when the user logs out themselves', async () => {
    renderApp('/budgets')
    await screen.findByRole('heading', { name: 'Budgets', level: 1 })

    fireEvent.click(screen.getAllByRole('button', { name: 'Log out' })[0])

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByText('Your session expired, please log in again.')).not.toBeInTheDocument()
  })
})

describe('a saved session that cannot be read', () => {
  it('shows the login page instead of loading forever', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fakeAuth.getSession.mockRejectedValue(new Error('Storage is blocked'))

    renderApp('/transactions')

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })
})

describe('a slow server', () => {
  it('says it may be waking up after about 5 seconds, and stops once the request ends', async () => {
    renderApp('/transactions')
    await screen.findByRole('heading', { name: 'Transactions', level: 1 })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const done = trackRequest()
    act(() => vi.advanceTimersByTime(4999))
    expect(screen.queryByText('Waking up the server, this can take up to a minute.')).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('Waking up the server, this can take up to a minute.')).toBeInTheDocument()

    act(() => done())
    expect(screen.queryByText('Waking up the server, this can take up to a minute.')).not.toBeInTheDocument()
  })
})
