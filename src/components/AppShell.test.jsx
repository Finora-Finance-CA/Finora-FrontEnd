// The app shell (sidebar, mobile top bar and menu sheet) through the whole app. The API
// modules are mocked.

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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

describe('AppShell', () => {
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

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('shows no navigation, menu or Log out to a signed-out visitor', async () => {
    resetFakeSupabase({ session: null })
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Log in' })

    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
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
      expect(within(screen.getByRole('main')).getByRole('heading', { level: 1 })).toHaveTextContent(heading)
      unmount()
    }
  })

  it('sends a signed-out visitor from /summary and /budgets to /login', async () => {
    for (const path of ['/summary', '/budgets']) {
      resetFakeSupabase({ session: null })
      const { unmount } = renderApp(path)

      expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
      expect(currentPath()).toBe('/login')
      unmount()
    }
  })
})

describe('mobile menu', () => {
  async function openMenu() {
    renderApp('/transactions')
    await screen.findByRole('heading', { name: 'Transactions', level: 1 })
    const button = screen.getByRole('button', { name: 'Open menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    return screen.getByRole('dialog', { name: 'Menu' })
  }

  it('opens the navigation and account in a sheet', async () => {
    const sheet = await openMenu()

    expect(screen.getByRole('button', { name: 'Open menu', hidden: true })).toHaveAttribute('aria-expanded', 'true')
    const nav = within(sheet).getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Transactions' })).toHaveAttribute('aria-current', 'page')
    expect(within(sheet).getByText('me@example.com')).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('closes when a page is chosen, and opens that page', async () => {
    const sheet = await openMenu()

    fireEvent.click(within(sheet).getByRole('link', { name: 'Budgets' }))

    expect(await screen.findByRole('heading', { name: 'Budgets', level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(currentPath()).toBe('/budgets')
  })

  it('closes on Escape and returns focus to the menu button', async () => {
    const sheet = await openMenu()

    fireEvent.keyDown(sheet, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus())
  })

  it('closes with its Close button', async () => {
    const sheet = await openMenu()

    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
