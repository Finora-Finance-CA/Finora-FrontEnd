// The header and main navigation, through the whole app. The API modules are mocked.

import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listBudgets } from '../api/budgets'
import { getMonthlySummary } from '../api/summary'
import { listTransactions } from '../api/transactions'
import { resetFakeSupabase } from '../test/fakeSupabase'
import { currentPath, renderApp } from '../test/renderApp'
import { pageOf } from '../test/transactions'

vi.mock('../api/transactions')
vi.mock('../api/summary')
vi.mock('../api/budgets')

function mainNav() {
  return screen.getByRole('navigation', { name: 'Main' })
}

beforeEach(() => {
  listTransactions.mockResolvedValue(pageOf([]))
  getMonthlySummary.mockImplementation(async (month) => ({
    month,
    income_cents: 0,
    expense_cents: 0,
    net_cents: 0,
    transaction_count: 0,
  }))
  listBudgets.mockResolvedValue([])
})

describe('AppHeader', () => {
  it('links to Transactions, Summary and Budgets, marking the current page', async () => {
    renderApp('/transactions')
    await screen.findByRole('heading', { name: 'Transactions', level: 1 })

    const links = within(mainNav()).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Transactions', 'Summary', 'Budgets'])
    expect(within(mainNav()).getByRole('link', { name: 'Transactions' })).toHaveAttribute('aria-current', 'page')
    expect(within(mainNav()).getByRole('link', { name: 'Summary' })).not.toHaveAttribute('aria-current')
  })

  it.each([
    ['Summary', '/summary', 'Monthly summary'],
    ['Budgets', '/budgets', 'Budgets'],
    ['Transactions', '/transactions', 'Transactions'],
  ])('opens %s and marks it as the current page', async (name, path, heading) => {
    renderApp(name === 'Transactions' ? '/budgets' : '/transactions')
    await screen.findByRole('navigation', { name: 'Main' })

    fireEvent.click(within(mainNav()).getByRole('link', { name }))

    expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeInTheDocument()
    expect(currentPath()).toBe(path)
    expect(within(mainNav()).getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
  })

  it('shows who is logged in, and Log out signs them out', async () => {
    renderApp('/summary')
    await screen.findByRole('heading', { name: 'Monthly summary' })

    expect(screen.getByText('me@example.com')).toBeInTheDocument()
    expect(screen.getByText('me@example.com').closest('p')).toHaveTextContent('Logged in as me@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('shows only the app name to a signed-out visitor', async () => {
    resetFakeSupabase({ session: null })
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Login' })

    expect(screen.getByText('Finora')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })

  it('has a skip link to the page’s main content on every page', async () => {
    for (const [path, heading] of [
      ['/transactions', 'Transactions'],
      ['/summary', 'Monthly summary'],
      ['/budgets', 'Budgets'],
    ]) {
      const { unmount } = renderApp(path)
      await screen.findByRole('heading', { name: heading, level: 1 })

      expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main')
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
      unmount()
    }
  })

  it('sends a signed-out visitor from /summary and /budgets to /login', async () => {
    for (const path of ['/summary', '/budgets']) {
      resetFakeSupabase({ session: null })
      const { unmount } = renderApp(path)

      expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
      expect(currentPath()).toBe('/login')
      unmount()
    }
  })
})
