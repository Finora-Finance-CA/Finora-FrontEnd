// The transactions page as a user sees it: the list, adding, editing and deleting.
// The API module is mocked; nothing leaves the test.

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from '../api/transactions'
import { endSession } from '../test/fakeSupabase'
import { currentPath, renderApp } from '../test/renderApp'
import { makeTransaction, savedFrom } from '../test/transactions'

vi.mock('../api/transactions')

const LUNCH = makeTransaction({ id: '1', date: '2026-10-05', description: 'Lunch', category: 'Food', amount_cents: 1250 })
const SALARY = makeTransaction({
  id: '2',
  date: '2026-10-01',
  type: 'income',
  category: null,
  description: 'Salary',
  amount_cents: 200000,
})
const RENT = makeTransaction({ id: '3', date: '2026-09-28', description: 'Rent', category: 'Housing', amount_cents: 95000 })

const SERVER_ERROR = new ApiError('server', 'Something went wrong on our end. Please try again in a moment.')
const NOT_FOUND = new ApiError('not_found', "We couldn't find that. It may have been deleted.", { status: 404 })
const SESSION_ENDED = new ApiError('unauthorized', 'Your session has ended. Sign in again.', { status: 401 })

/** A promise the test resolves or rejects when it chooses, to hold a request "in flight". */
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function rowFor(description) {
  return within(screen.getByRole('list')).getByText(description).closest('li')
}

function descriptionsInList() {
  return within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((row) => row.querySelector('.transaction-row__description').textContent)
}

async function showList(transactions = [LUNCH, SALARY, RENT]) {
  listTransactions.mockResolvedValue(transactions)
  renderApp()
  await screen.findByRole('list')
}

function statusMessage() {
  return screen.getAllByRole('status').map((element) => element.textContent).join(' ')
}

beforeEach(() => {
  listTransactions.mockResolvedValue([])
})

describe('Recent transactions list', () => {
  it('shows a loading message while the list loads', async () => {
    listTransactions.mockReturnValue(deferred().promise)
    renderApp()

    expect(await screen.findByText('Loading transactions…')).toBeInTheDocument()
  })

  it('says when there are no transactions yet', async () => {
    renderApp()

    expect(await screen.findByText('No transactions yet. Add one above and it will show here.')).toBeInTheDocument()
  })

  it('shows each transaction newest first, with date, type, category, description and amount', async () => {
    await showList([RENT, LUNCH, SALARY])

    expect(descriptionsInList()).toEqual(['Lunch', 'Salary', 'Rent'])

    const lunch = rowFor('Lunch')
    expect(lunch).toHaveTextContent('Oct 5, 2026')
    expect(lunch).toHaveTextContent('Expense')
    expect(lunch).toHaveTextContent('Food')
    expect(lunch).toHaveTextContent('−$12.50')

    const salary = rowFor('Salary')
    expect(salary).toHaveTextContent('Income')
    expect(salary).toHaveTextContent('+$2,000.00')
    expect(salary).not.toHaveTextContent('Food')
  })

  it('names the transaction on every Edit and Delete button for screen readers', async () => {
    await showList()

    expect(within(rowFor('Lunch')).getByRole('button', { name: 'Edit: Lunch, $12.50, Oct 5, 2026' })).toBeInTheDocument()
    expect(within(rowFor('Rent')).getByRole('button', { name: 'Delete: Rent, $950.00, Sep 28, 2026' })).toBeInTheDocument()
  })

  it('labels a transaction without a description', async () => {
    await showList([makeTransaction({ description: null })])

    expect(screen.getByText('No description')).toBeInTheDocument()
  })

  it('shows an error with Try again, which loads the list again', async () => {
    listTransactions.mockRejectedValueOnce(new ApiError('network', "We couldn't reach the server. Check your connection and try again."))
    listTransactions.mockResolvedValueOnce([LUNCH])
    renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't load your transactions. We couldn't reach the server. Check your connection and try again."
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Lunch')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(listTransactions).toHaveBeenCalledTimes(2)
  })

  it('never shows the raw text of an unexpected error', async () => {
    listTransactions.mockRejectedValue(new TypeError("Cannot read properties of undefined (reading 'map')"))
    renderApp()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("We couldn't load your transactions. Something went wrong. Please try again.")
    expect(alert).not.toHaveTextContent('Cannot read')
  })

  it('offers Sign in again, not Try again, when the session has ended', async () => {
    listTransactions.mockRejectedValue(SESSION_ENDED)
    renderApp()

    expect(await screen.findByRole('link', { name: 'Sign in again.' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})

describe('adding a transaction', () => {
  it('shows the new transaction in the list without reloading it', async () => {
    createTransaction.mockImplementation(async (payload) => savedFrom(payload, { id: '50', date: '2026-10-09' }))
    await showList()

    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '4.75' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } })
    fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'Coffee' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(await screen.findByText('Coffee')).toBeInTheDocument()
    expect(descriptionsInList()).toEqual(['Coffee', 'Lunch', 'Salary', 'Rent'])
    expect(listTransactions).toHaveBeenCalledTimes(1)
  })

  it('does not let a slow, older list response hide a transaction added meanwhile', async () => {
    const firstLoad = deferred()
    const secondLoad = deferred()
    listTransactions.mockReturnValueOnce(firstLoad.promise).mockReturnValueOnce(secondLoad.promise)
    const coffee = makeTransaction({ id: '50', description: 'Coffee', date: '2026-10-09' })
    createTransaction.mockResolvedValue(coffee)
    renderApp()

    await screen.findByText('Loading transactions…')
    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '4.75' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))
    await screen.findByText('Expense of $4.75 saved.')

    await act(async () => secondLoad.resolve([coffee, LUNCH]))
    await act(async () => firstLoad.resolve([LUNCH]))

    expect(descriptionsInList()).toEqual(['Coffee', 'Lunch'])
  })
})

describe('editing a transaction', () => {
  async function openEdit(description) {
    fireEvent.click(within(rowFor(description)).getByRole('button', { name: /^Edit/ }))
    return screen.findByRole('dialog')
  }

  it('opens a dialog filled in with the current values, with focus on the first field', async () => {
    await showList()

    const dialog = await openEdit('Lunch')

    expect(dialog).toHaveAccessibleName('Edit expense')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText('Expense')).toBeInTheDocument()
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('Amount ($)')).toHaveValue('12.50')
    expect(within(dialog).getByLabelText('Date')).toHaveValue('2026-10-05')
    expect(within(dialog).getByLabelText('Category')).toHaveValue('Food')
    expect(within(dialog).getByLabelText('Description (optional)')).toHaveValue('Lunch')
    expect(within(dialog).getByLabelText('Amount ($)')).toHaveFocus()
  })

  it('makes the page behind the dialog inert', async () => {
    await showList()

    await openEdit('Lunch')

    expect(screen.getByRole('main', { hidden: true }).closest('body > *')).toHaveAttribute('inert')
  })

  it('has no category field when editing an income', async () => {
    await showList()

    const dialog = await openEdit('Salary')

    expect(dialog).toHaveAccessibleName('Edit income')
    expect(within(dialog).queryByLabelText('Category')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('Amount ($)')).toHaveValue('2000.00')
  })

  it('saves every changed field and shows the change in the right place at once', async () => {
    updateTransaction.mockImplementation(async (id, payload) => savedFrom(payload, { id }))
    await showList()
    const dialog = await openEdit('Rent')

    fireEvent.change(within(dialog).getByLabelText('Amount ($)'), { target: { value: '1,000.50' } })
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-10-08' } })
    fireEvent.change(within(dialog).getByLabelText('Category'), { target: { value: 'Other' } })
    fireEvent.change(within(dialog).getByLabelText('Description (optional)'), { target: { value: 'Rent and parking' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(updateTransaction).toHaveBeenCalledWith('3', {
      amount_cents: 100050,
      date: '2026-10-08',
      type: 'expense',
      category: 'Other',
      description: 'Rent and parking',
    })
    expect(descriptionsInList()).toEqual(['Rent and parking', 'Lunch', 'Salary'])
    const row = rowFor('Rent and parking')
    expect(row).toHaveTextContent('Oct 8, 2026')
    expect(row).toHaveTextContent('Other')
    expect(row).toHaveTextContent('−$1,000.50')
    expect(statusMessage()).toContain('Transaction updated.')
    await waitFor(() => expect(within(row).getByRole('button', { name: /^Edit/ })).toHaveFocus())
  })

  it('clears the description when it is emptied', async () => {
    updateTransaction.mockImplementation(async (id, payload) => savedFrom(payload, { id }))
    await showList()
    const dialog = await openEdit('Salary')

    fireEvent.change(within(dialog).getByLabelText('Description (optional)'), { target: { value: '  ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(updateTransaction).toHaveBeenCalledWith('2', { amount_cents: 200000, date: '2026-10-01', type: 'income' })
  })

  it.each([
    ['Cancel', (dialog) => fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))],
    ['Escape', (dialog) => fireEvent.keyDown(dialog, { key: 'Escape' })],
  ])('%s closes without saving and the next edit starts from the saved values', async (_, close) => {
    await showList()
    let dialog = await openEdit('Lunch')
    fireEvent.change(within(dialog).getByLabelText('Amount ($)'), { target: { value: '99.99' } })

    close(dialog)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(updateTransaction).not.toHaveBeenCalled()
    expect(rowFor('Lunch')).toHaveTextContent('−$12.50')
    await waitFor(() => expect(within(rowFor('Lunch')).getByRole('button', { name: /^Edit/ })).toHaveFocus())
    dialog = await openEdit('Lunch')
    expect(within(dialog).getByLabelText('Amount ($)')).toHaveValue('12.50')
  })

  it('shows validation errors next to their fields and does not save', async () => {
    await showList()
    const dialog = await openEdit('Lunch')

    fireEvent.change(within(dialog).getByLabelText('Amount ($)'), { target: { value: '' } })
    fireEvent.change(within(dialog).getByLabelText('Category'), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(within(dialog).getByLabelText('Amount ($)')).toHaveAccessibleDescription(expect.stringContaining('Enter an amount.'))
    expect(within(dialog).getByLabelText('Category')).toHaveAccessibleDescription('Choose a category.')
    expect(within(dialog).getByLabelText('Amount ($)')).toHaveFocus()
    expect(updateTransaction).not.toHaveBeenCalled()
  })

  it('shows field errors returned by the API', async () => {
    updateTransaction.mockRejectedValue(
      new ApiError('validation', 'Some details need fixing. Check the highlighted fields.', {
        fieldErrors: { date: 'date must be a real calendar date.' },
      })
    )
    await showList()
    const dialog = await openEdit('Lunch')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByText('Date must be a real calendar date.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('removes the row and says so when the transaction no longer exists', async () => {
    updateTransaction.mockRejectedValue(NOT_FOUND)
    await showList()
    const dialog = await openEdit('Lunch')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText('Lunch')).not.toBeInTheDocument()
    expect(statusMessage()).toContain('That transaction no longer exists, so it was removed from the list.')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Recent transactions' })).toHaveFocus())
  })

  it('keeps the dialog, the typed values and the row when saving fails for another reason', async () => {
    updateTransaction.mockRejectedValue(SERVER_ERROR)
    await showList()
    const dialog = await openEdit('Lunch')
    fireEvent.change(within(dialog).getByLabelText('Amount ($)'), { target: { value: '15.00' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Something went wrong on our end. Please try again in a moment.'
    )
    expect(within(dialog).getByLabelText('Amount ($)')).toHaveValue('15.00')
    expect(rowFor('Lunch')).toHaveTextContent('−$12.50')
  })

  it('shows Sign in again when the session has ended', async () => {
    updateTransaction.mockRejectedValue(SESSION_ENDED)
    await showList()
    const dialog = await openEdit('Lunch')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByRole('link', { name: 'Sign in again.' })).toBeInTheDocument()
  })

  it('locks the dialog while saving, so nothing is sent twice and it cannot be closed', async () => {
    const save = deferred()
    updateTransaction.mockReturnValue(save.promise)
    await showList()
    const dialog = await openEdit('Lunch')
    const saveButton = within(dialog).getByRole('button', { name: 'Save changes' })

    fireEvent.click(saveButton)
    fireEvent.click(saveButton)

    expect(await within(dialog).findByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(updateTransaction).toHaveBeenCalledTimes(1)

    await act(async () => save.resolve(LUNCH))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    await showList()
    const dialog = await openEdit('Lunch')
    const amount = within(dialog).getByLabelText('Amount ($)')
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })

    cancel.focus()
    fireEvent.keyDown(cancel, { key: 'Tab' })
    expect(amount).toHaveFocus()

    fireEvent.keyDown(amount, { key: 'Tab', shiftKey: true })
    expect(cancel).toHaveFocus()
  })
})

describe('deleting a transaction', () => {
  async function openDelete(description) {
    fireEvent.click(within(rowFor(description)).getByRole('button', { name: /^Delete/ }))
    return screen.findByRole('dialog')
  }

  it('asks for confirmation, showing the amount, date and description, with Cancel focused', async () => {
    await showList()

    const dialog = await openDelete('Rent')

    expect(dialog).toHaveAccessibleName('Delete this transaction?')
    expect(dialog).toHaveTextContent('$950.00')
    expect(dialog).toHaveTextContent('Sep 28, 2026')
    expect(dialog).toHaveTextContent('Rent')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(deleteTransaction).not.toHaveBeenCalled()
  })

  it.each([
    ['Cancel', (dialog) => fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))],
    ['Escape', (dialog) => fireEvent.keyDown(dialog, { key: 'Escape' })],
  ])('%s keeps the transaction and returns focus to its Delete button', async (_, close) => {
    await showList()
    const dialog = await openDelete('Rent')

    close(dialog)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteTransaction).not.toHaveBeenCalled()
    await waitFor(() => expect(within(rowFor('Rent')).getByRole('button', { name: /^Delete/ })).toHaveFocus())
  })

  it('removes the transaction from the list once confirmed', async () => {
    deleteTransaction.mockResolvedValue(undefined)
    await showList()
    const dialog = await openDelete('Rent')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(deleteTransaction).toHaveBeenCalledWith('3')
    expect(descriptionsInList()).toEqual(['Lunch', 'Salary'])
    expect(statusMessage()).toContain('Transaction deleted.')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Recent transactions' })).toHaveFocus())
  })

  it('removes the row and says so when it was already deleted', async () => {
    deleteTransaction.mockRejectedValue(NOT_FOUND)
    await showList()
    const dialog = await openDelete('Rent')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText('Rent')).not.toBeInTheDocument()
    expect(statusMessage()).toContain('That transaction was already deleted, so it was removed from the list.')
  })

  it('keeps the transaction and explains when deleting fails for another reason', async () => {
    deleteTransaction.mockRejectedValue(SERVER_ERROR)
    await showList()
    const dialog = await openDelete('Rent')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The transaction was not deleted. Something went wrong on our end. Please try again in a moment.'
    )
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(rowFor('Rent')).toBeInTheDocument()
  })

  it('shows Sign in again when the session has ended', async () => {
    deleteTransaction.mockRejectedValue(SESSION_ENDED)
    await showList()
    const dialog = await openDelete('Rent')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await within(dialog).findByRole('link', { name: 'Sign in again.' })).toBeInTheDocument()
  })

  it('locks the dialog while deleting, so nothing is sent twice and it cannot be closed', async () => {
    const request = deferred()
    deleteTransaction.mockReturnValue(request.promise)
    await showList()
    const dialog = await openDelete('Rent')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    fireEvent.click(within(dialog).getByRole('button', { name: /Delet/ }))

    expect(within(dialog).getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(deleteTransaction).toHaveBeenCalledTimes(1)

    await act(async () => request.resolve())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('changes nothing if the page closes while the request is out', async () => {
    const request = deferred()
    deleteTransaction.mockReturnValue(request.promise)
    await showList()
    const dialog = await openDelete('Rent')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    act(() => endSession())
    await screen.findByRole('heading', { name: 'Login' })
    await act(async () => request.resolve())

    expect(currentPath()).toBe('/login')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
