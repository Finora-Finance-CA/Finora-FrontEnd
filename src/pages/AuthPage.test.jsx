// The login and register pages as a user sees them. Supabase is the fake from
// src/test/setup.js, signed out here.

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listTransactions } from '../api/transactions'
import { fakeAuth, resetFakeSupabase } from '../test/fakeSupabase'
import { currentPath, renderApp } from '../test/renderApp'
import { pageOf } from '../test/transactions'

vi.mock('../api/transactions')

function deferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

async function showPage(path = '/login') {
  renderApp(path)
  await screen.findByRole('heading', { level: 1 })
}

function fill({ email, password }) {
  if (email !== undefined) fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  if (password !== undefined) fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

beforeEach(() => {
  resetFakeSupabase({ session: null })
  listTransactions.mockReset().mockResolvedValue(pageOf([]))
})

describe('login page', () => {
  it('shows the logo, a heading, labelled fields and a link to register, with no app chrome', async () => {
    await showPage()

    expect(screen.getByText('Finora')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Log in', level: 1 })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('link', { name: 'Create one' })).toHaveAttribute('href', '/register')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('asks for both fields under each one, focuses the first and calls nothing', async () => {
    await showPage()

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email.')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password.')
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(fakeAuth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('explains an email that is not an address, and clears it once edited', async () => {
    await showPage()
    fill({ email: 'me@example', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email address, like name@example.com.')
    fill({ email: 'me@example.com' })
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid')
  })

  it('logs in with the trimmed email and goes to the transactions page', async () => {
    await showPage()
    fill({ email: '  me@example.com ', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('heading', { name: 'Transactions', level: 1 })).toBeInTheDocument()
    expect(fakeAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'me@example.com', password: 'password123' })
    expect(currentPath()).toBe('/transactions')
  })

  it('shows a friendly message for wrong details, never Supabase’s text', async () => {
    fakeAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    await showPage()
    fill({ email: 'me@example.com', password: 'wrong-password' })

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Incorrect email or password.')
    expect(alert).not.toHaveTextContent('Invalid login credentials')
  })

  it('uses a plain message for an error it does not know', async () => {
    fakeAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'unexpected_failure', message: 'AuthApiError: relation "users" does not exist' },
    })
    await showPage()
    fill({ email: 'me@example.com', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("We couldn't log you in. Please try again.")
    expect(alert).not.toHaveTextContent('relation')
  })

  it('shows a plain message, and logs it, when signing in throws', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    fakeAuth.signInWithPassword.mockRejectedValue(new TypeError('boom'))
    await showPage()
    fill({ email: 'me@example.com', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(logged).toHaveBeenCalledWith('Unexpected auth error:', expect.any(TypeError))
  })

  it('disables the button while logging in, so it is sent once', async () => {
    const request = deferred()
    fakeAuth.signInWithPassword.mockReturnValue(request.promise)
    await showPage()
    fill({ email: 'me@example.com', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled()
    request.resolve({ data: { session: null }, error: { code: 'invalid_credentials' } })
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeEnabled()
  })

  it('shows and hides the password with a toggle button', async () => {
    await showPage()
    const toggle = screen.getByRole('button', { name: 'Show password' })

    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('goes back to the page the visitor wanted after logging in', async () => {
    renderApp('/budgets')
    await screen.findByRole('heading', { name: 'Log in' })
    fill({ email: 'me@example.com', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(currentPath()).toBe('/budgets'))
  })
})

describe('register page', () => {
  it('shows its own heading, a password hint and a link to log in', async () => {
    await showPage('/register')

    expect(screen.getByRole('heading', { name: 'Create your account', level: 1 })).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters.')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  })

  it('asks for at least 8 characters and focuses the password', async () => {
    await showPage('/register')
    fill({ email: 'me@example.com', password: 'short' })

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 8 characters. Use at least 8 characters.'
    )
    expect(screen.getByLabelText('Password')).toHaveFocus()
    expect(fakeAuth.signUp).not.toHaveBeenCalled()
  })

  it('creates the account and signs straight in', async () => {
    await showPage('/register')
    fill({ email: 'new@example.com', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Transactions', level: 1 })).toBeInTheDocument()
    expect(fakeAuth.signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'password123' })
  })

  it('says to check email when the account needs confirming first', async () => {
    fakeAuth.signUp.mockResolvedValue({ data: { session: null, user: { email: 'new@example.com' } }, error: null })
    await showPage('/register')
    fill({ email: 'new@example.com', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    const message = await screen.findByText('Account created. Check your email to confirm it, then log in.')
    expect(message.closest('[role="status"]')).toBeInTheDocument()
  })

  it('explains an email that is already registered', async () => {
    fakeAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: { code: 'user_already_exists', message: 'User already registered' },
    })
    await showPage('/register')
    fill({ email: 'me@example.com', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.')
  })

  it('puts a weak password message under the password field', async () => {
    fakeAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: { code: 'weak_password', message: 'Password should contain at least one character of each' },
    })
    await showPage('/register')
    fill({ email: 'me@example.com', password: 'password123' })

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
        'At least 8 characters. Please choose a stronger password.'
      )
    )
    expect(screen.getByLabelText('Password')).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
