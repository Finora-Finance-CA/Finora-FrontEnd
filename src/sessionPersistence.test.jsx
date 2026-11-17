// US-59 (FR-19, NFR-05): a refresh keeps the user signed in on the same page with the
// same filters; logging out leaves nothing of theirs behind; logging back in loads the
// same data again; and a saved session that can't be restored sends the user to log in
// instead of leaving them on "Loading…".
//
// Each test renders the app from scratch, as a page load does. The fake Supabase
// (src/test/fakeSupabase.js) keeps the session the way the real one keeps it in
// localStorage; the API modules are mocked and answer for whoever is signed in.

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBudgetStatus, listBudgets } from './api/budgets'
import { listTransactions } from './api/transactions'
import { SESSION_RESTORE_TIMEOUT_MS } from './context/useAuth'
import { currentSession, fakeAuth, signInElsewhere } from './test/fakeSupabase'
import { currentPath, currentSearch, renderApp } from './test/renderApp'
import { makeTransaction, pageOf } from './test/transactions'

vi.mock('./api/transactions')
vi.mock('./api/budgets')

// Each user's own transactions, as the API would return them.
const DATA = {
  'me@example.com': [makeTransaction({ id: '1', description: 'Alice lunch', amount_cents: 1250, category: 'Food' })],
  'bob@example.com': [makeTransaction({ id: '2', description: 'Bob rent', amount_cents: 95000, category: 'Housing' })],
}

const RESTORE_FAILED = "We couldn't restore your session, please log in again."

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function signedInEmail() {
  return currentSession()?.user.email
}

async function logIn(email, password = 'password123') {
  await screen.findByRole('heading', { name: 'Log in' })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
}

function logOut() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Log out' })[0])
}

// A saved session that is still being read, as on the first moments of a page load.
function holdSessionRestore() {
  const restore = deferred()
  const signedIn = currentSession()
  fakeAuth.getSession.mockImplementation(() => restore.promise)
  return { finish: () => restore.resolve({ data: { session: signedIn }, error: null }), restore }
}

beforeEach(() => {
  listTransactions.mockReset().mockImplementation(async () => pageOf(DATA[signedInEmail()] ?? []))
  listBudgets.mockReset().mockResolvedValue([])
  getBudgetStatus.mockReset().mockImplementation(async (month) => ({ month, budgets: [] }))
  window.localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('refreshing a signed-in page', () => {
  it('waits for the saved session, then shows the same page, without a detour to login', async () => {
    const { finish } = holdSessionRestore()
    renderApp('/budgets?month=2026-09')

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument()
    expect(currentPath()).toBe('/budgets')
    expect(listBudgets).not.toHaveBeenCalled()

    await act(async () => finish())

    expect(await screen.findByRole('heading', { name: 'Budgets', level: 1 })).toBeInTheDocument()
    expect(currentPath()).toBe('/budgets')
    expect(currentSearch()).toBe('?month=2026-09')
  })

  it('keeps the search, filters and page in the URL, and loads exactly those', async () => {
    const { finish } = holdSessionRestore()
    renderApp('/transactions?q=lunch&category=Food&from=2026-10-01&to=2026-10-31&page=2')

    await act(async () => finish())

    await waitFor(() =>
      expect(listTransactions).toHaveBeenCalledWith({
        page: 2,
        q: 'lunch',
        categories: ['Food'],
        from: '2026-10-01',
        to: '2026-10-31',
      })
    )
    expect(currentSearch()).toBe('?q=lunch&category=Food&from=2026-10-01&to=2026-10-31&page=2')
    expect(screen.getByRole('searchbox')).toHaveValue('lunch')
  })

  it('sends a signed-out visitor to login, and back to the same page and filters after logging in', async () => {
    fakeAuth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    renderApp('/transactions?q=lunch')

    await logIn('me@example.com')

    expect(await screen.findByRole('heading', { name: 'Transactions', level: 1 })).toBeInTheDocument()
    expect(currentPath()).toBe('/transactions')
    expect(currentSearch()).toBe('?q=lunch')
  })
})

describe('logging out', () => {
  it('leaves none of the user’s data or messages on screen', async () => {
    renderApp('/transactions')
    expect(await screen.findByText('Alice lunch')).toBeInTheDocument()

    logOut()

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByText('Alice lunch')).not.toBeInTheDocument()
    expect(document.querySelector('[data-live-region]')).toBeEmptyDOMElement()
    expect(currentSession()).toBeNull()
  })

  it('shows the next user on this browser only their own data', async () => {
    renderApp('/transactions')
    await screen.findByText('Alice lunch')
    logOut()

    await logIn('bob@example.com')

    expect(await screen.findByText('Bob rent')).toBeInTheDocument()
    expect(screen.queryByText('Alice lunch')).not.toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('never shows the previous user’s data that arrives late, after they logged out', async () => {
    const alicesPage = deferred()
    listTransactions.mockImplementationOnce(() => alicesPage.promise)
    renderApp('/transactions')
    await screen.findByRole('heading', { name: 'Transactions', level: 1 })

    logOut()
    await logIn('bob@example.com')
    expect(await screen.findByText('Bob rent')).toBeInTheDocument()

    await act(async () => alicesPage.resolve(pageOf(DATA['me@example.com'])))

    expect(screen.queryByText('Alice lunch')).not.toBeInTheDocument()
    expect(screen.getByText('Bob rent')).toBeInTheDocument()
  })

  it('starts every page again when a different user signs in from another tab', async () => {
    renderApp('/transactions')
    await screen.findByText('Alice lunch')

    await act(async () => signInElsewhere('bob@example.com'))

    expect(await screen.findByText('Bob rent')).toBeInTheDocument()
    expect(screen.queryByText('Alice lunch')).not.toBeInTheDocument()
  })
})

describe('logging back in', () => {
  it('loads the data again from the API, and it is the same as before', async () => {
    renderApp('/transactions')
    await screen.findByText('Alice lunch')
    const callsBefore = listTransactions.mock.calls.length

    logOut()
    await logIn('me@example.com')

    expect(await screen.findByText('Alice lunch')).toBeInTheDocument()
    expect(listTransactions.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})

describe('a saved session that cannot be restored', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    window.localStorage.setItem('sb-testproject-auth-token', '{"broken":')
    window.localStorage.setItem('finora-unrelated', 'kept')
  })

  async function expectSentToLogin() {
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByText(RESTORE_FAILED)).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('sb-testproject-auth-token')).toBeNull()
    expect(window.localStorage.getItem('finora-unrelated')).toBe('kept')
    expect(fakeAuth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  }

  it('sends the user to log in when Supabase reports an error', async () => {
    fakeAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthApiError', message: 'Invalid Refresh Token: Refresh Token Not Found' },
    })

    renderApp('/budgets')

    await expectSentToLogin()
  })

  it('sends the user to log in when reading it throws', async () => {
    fakeAuth.getSession.mockRejectedValue(new Error('Storage is blocked'))

    renderApp('/budgets')

    await expectSentToLogin()
  })

  it(`gives up after ${SESSION_RESTORE_TIMEOUT_MS} ms with no answer, and ignores an answer that comes later`, async () => {
    const { finish } = holdSessionRestore()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderApp('/budgets')

    act(() => vi.advanceTimersByTime(SESSION_RESTORE_TIMEOUT_MS - 1))
    expect(screen.getByText('Loading…')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    vi.useRealTimers()

    await expectSentToLogin()

    await act(async () => finish())
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('lets the user log in again straight away, and drops the message', async () => {
    fakeAuth.getSession.mockRejectedValue(new Error('Storage is blocked'))
    renderApp('/budgets')
    await screen.findByText(RESTORE_FAILED)

    await logIn('me@example.com')

    expect(await screen.findByRole('heading', { name: 'Budgets', level: 1 })).toBeInTheDocument()
    expect(currentPath()).toBe('/budgets')
    expect(screen.queryByText(RESTORE_FAILED)).not.toBeInTheDocument()
  })

  it('never clears a session that Supabase restored before getSession answered', async () => {
    holdSessionRestore()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderApp('/budgets')

    await act(async () => signInElsewhere('me@example.com'))
    act(() => vi.advanceTimersByTime(SESSION_RESTORE_TIMEOUT_MS * 2))
    vi.useRealTimers()

    expect(await screen.findByRole('heading', { name: 'Budgets', level: 1 })).toBeInTheDocument()
    expect(window.localStorage.getItem('sb-testproject-auth-token')).not.toBeNull()
    expect(screen.queryByText(RESTORE_FAILED)).not.toBeInTheDocument()
  })
})
