// US-38: every way a transaction changes on the Transactions page tells the other pages,
// so budgets and the summary load again. The API module is mocked, and so is the sync
// hook, so the test sees each notification.

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from '../api/transactions'
import { renderApp } from '../test/renderApp'
import { makeTransaction, pageOf, savedFrom } from '../test/transactions'

const notify = vi.hoisted(() => vi.fn())

vi.mock('../api/transactions')
vi.mock('../context/useTransactionsSync', async (importOriginal) => ({
  ...(await importOriginal()),
  useTransactionsSync: () => ({ version: 0, notifyTransactionsChanged: notify }),
}))

const LUNCH = makeTransaction({ id: '1', description: 'Lunch', category: 'Food', amount_cents: 1250 })
const NOT_FOUND = new ApiError('not_found', "We couldn't find that. It may have been deleted.", { status: 404 })
const SERVER_ERROR = new ApiError('server', 'Something went wrong on our end. Please try again in a moment.')

async function showLunch() {
  listTransactions.mockResolvedValue(pageOf([LUNCH]))
  renderApp('/transactions')
  await screen.findByText('Lunch', { selector: '.transaction-row__description' })
}

function chooseAction(action) {
  fireEvent.click(screen.getByRole('button', { name: /^Actions for Lunch/ }))
  fireEvent.click(screen.getByRole('menuitem', { name: action }))
}

async function addLunch() {
  fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }))
  const drawer = await screen.findByRole('dialog', { name: 'Add expense' })
  fireEvent.change(within(drawer).getByLabelText('Amount ($)'), { target: { value: '12.50' } })
  fireEvent.change(within(drawer).getByLabelText('Category'), { target: { value: 'Food' } })
  fireEvent.click(within(drawer).getByRole('button', { name: 'Save expense' }))
}

// The page is lazy-loaded. Compile it here, so the first test's time isn't spent on it
// when every file runs at once.
beforeAll(async () => {
  await import('../pages/TransactionsPage')
})

beforeEach(() => {
  notify.mockReset()
  for (const mock of [createTransaction, deleteTransaction, listTransactions, updateTransaction]) mock.mockReset()
})

describe('notifying that transactions changed (US-38)', () => {
  it('notifies once after adding', async () => {
    createTransaction.mockImplementation(async (payload) => savedFrom(payload))
    await showLunch()

    await addLunch()

    await waitFor(() => expect(notify).toHaveBeenCalledTimes(1))
  })

  it('does not notify when adding fails', async () => {
    createTransaction.mockRejectedValue(SERVER_ERROR)
    await showLunch()

    await addLunch()

    expect(await screen.findByText(SERVER_ERROR.message, { exact: false })).toBeInTheDocument()
    expect(notify).not.toHaveBeenCalled()
  })

  it('notifies once after editing', async () => {
    updateTransaction.mockImplementation(async (id, payload) => savedFrom(payload, { id }))
    await showLunch()

    chooseAction('Edit')
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Amount ($)'), { target: { value: '15.00' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('notifies once after deleting', async () => {
    deleteTransaction.mockResolvedValue(undefined)
    await showLunch()

    chooseAction('Delete')
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['editing', 'Edit', () => updateTransaction.mockRejectedValue(NOT_FOUND)],
    ['deleting', 'Delete', () => deleteTransaction.mockRejectedValue(NOT_FOUND)],
  ])('notifies once when %s finds the transaction was already gone', async (_, action, fail) => {
    fail()
    await showLunch()

    chooseAction(action)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: action === 'Edit' ? 'Save changes' : 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(notify).toHaveBeenCalledTimes(1)
  })
})
