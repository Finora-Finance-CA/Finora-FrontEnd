// Routing, sessions and the add forms through the whole app. The API module is mocked;
// Supabase is the fake from src/test/setup.js.

import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTransaction, listTransactions } from './api/transactions'
import { ApiError } from './api/client'
import { endSession, fakeAuth, resetFakeSupabase } from './test/fakeSupabase'
import { currentPath, renderApp } from './test/renderApp'
import { savedFrom } from './test/transactions'

vi.mock('./api/transactions')

const SESSION_ENDED = new ApiError('unauthorized', 'Your session has ended. Sign in again.', { status: 401 })

beforeEach(() => {
  listTransactions.mockResolvedValue([])
})

async function fillExpense({ amount = '12.50', category = 'Food' } = {}) {
  await screen.findByRole('heading', { name: 'Add expense' })
  fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: amount } })
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: category } })
}

describe('routes', () => {
  it('sends a signed-out visitor from /transactions to /login', async () => {
    resetFakeSupabase({ session: null })
    renderApp('/transactions')

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(currentPath()).toBe('/login')
  })

  it('shows the register page to a signed-out visitor', async () => {
    resetFakeSupabase({ session: null })
    renderApp('/register')

    expect(await screen.findByRole('heading', { name: 'Register' })).toBeInTheDocument()
  })

  it('sends / to the transactions page when signed in', async () => {
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Transactions', level: 1 })).toBeInTheDocument()
    expect(currentPath()).toBe('/transactions')
  })

  it('returns to /login after Log out', async () => {
    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(currentPath()).toBe('/login')
  })
})

describe('add forms', () => {
  it('saves an expense', async () => {
    createTransaction.mockImplementation(async (payload) => savedFrom(payload))
    renderApp()
    await fillExpense()

    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(await screen.findByText('Expense of $12.50 saved.')).toBeInTheDocument()
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount_cents: 1250, type: 'expense', category: 'Food' })
    )
  })

  it('saves an income without a category', async () => {
    createTransaction.mockImplementation(async (payload) => savedFrom(payload))
    renderApp()

    fireEvent.click(await screen.findByRole('radio', { name: 'Income' }))
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '2,000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save income' }))

    expect(await screen.findByText('Income of $2,000.00 saved.')).toBeInTheDocument()
    const sent = createTransaction.mock.calls[0][0]
    expect(sent).toMatchObject({ amount_cents: 200000, type: 'income' })
    expect(sent).not.toHaveProperty('category')
  })

  it('blocks invalid input without calling the API', async () => {
    renderApp()
    await screen.findByRole('heading', { name: 'Add expense' })

    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '1.999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(await screen.findByText('Use at most two decimal places, like 12.50.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('shows a plain message, with no sign-in link, for an error other than 401', async () => {
    createTransaction.mockRejectedValue(new ApiError('server', 'Something went wrong on our end. Please try again in a moment.'))
    renderApp()
    await fillExpense()

    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong on our end. Please try again in a moment.')
    expect(screen.queryByRole('link', { name: 'Sign in again.' })).not.toBeInTheDocument()
  })
})

describe('when the session has ended', () => {
  async function reachSessionEnded() {
    createTransaction.mockRejectedValue(SESSION_ENDED)
    renderApp()
    await fillExpense()
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))
    return screen.findByRole('link', { name: 'Sign in again.' })
  }

  it('says so, signs out through the link, and returns to /transactions after logging in', async () => {
    const link = await reachSessionEnded()
    expect(screen.getByRole('alert')).toHaveTextContent('Your session has ended. Sign in again.')
    expect(link).toHaveAttribute('href', '/login')

    fireEvent.click(link)
    await screen.findByRole('heading', { name: 'Login' })
    expect(fakeAuth.signOut).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'me@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByRole('heading', { name: 'Add expense' })).toBeInTheDocument()
    expect(currentPath()).toBe('/transactions')
  })

  it('still reaches /login when sign-out reports an error, and logs it', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    fakeAuth.signOut.mockImplementationOnce(async () => {
      // Supabase clears the local session even when the sign-out request fails.
      endSession()
      return { error: new Error('network down') }
    })
    const link = await reachSessionEnded()

    fireEvent.click(link)

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(logged).toHaveBeenCalledWith('Sign out failed:', expect.any(Error))
  })

  it('signs out only once when the link is clicked twice', async () => {
    const link = await reachSessionEnded()

    fireEvent.click(link)
    fireEvent.click(link)

    await screen.findByRole('heading', { name: 'Login' })
    expect(fakeAuth.signOut).toHaveBeenCalledTimes(1)
  })
})
