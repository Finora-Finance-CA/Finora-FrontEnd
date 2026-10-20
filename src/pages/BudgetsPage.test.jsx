// The Budgets page (US-32, US-33) as a user sees it. The API module is mocked; nothing
// leaves the test.

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBudget, deleteBudget, listBudgets, updateBudget } from '../api/budgets'
import { ApiError } from '../api/client'
import { renderApp } from '../test/renderApp'

vi.mock('../api/budgets')

const FOOD = { id: '7', user_id: 'u', category: 'Food', limit_cents: 50000 }
const HOUSING = { id: '8', user_id: 'u', category: 'Housing', limit_cents: 180000 }

const SERVER_ERROR = new ApiError('server', 'Something went wrong on our end. Please try again in a moment.')
const NOT_FOUND = new ApiError('not_found', "We couldn't find that. It may have been deleted.", { status: 404 })
const CONFLICT = new ApiError('conflict', 'You already have a budget for Food. Change that one instead.', { status: 409 })
const SESSION_ENDED = new ApiError('unauthorized', 'Your session has ended. Sign in again.', { status: 401 })

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function budgetList() {
  return screen.getByRole('main').querySelector('.budget-list')
}

function rowFor(category) {
  return within(budgetList()).getByRole('heading', { name: category }).closest('li')
}

async function showBudgets(budgets = [FOOD, HOUSING]) {
  listBudgets.mockResolvedValue(budgets)
  renderApp('/budgets')
  await screen.findByRole('heading', { name: 'Food' })
}

async function openForm(category) {
  const row = rowFor(category)
  fireEvent.click(within(row).getByRole('button', { name: new RegExp(`^(Set limit for|Edit) ${category}`) }))
  return within(rowFor(category)).getByLabelText(`Monthly limit for ${category} ($)`)
}

function submit(category) {
  fireEvent.click(within(rowFor(category)).getByRole('button', { name: 'Save limit' }))
}

beforeEach(() => {
  for (const mock of [createBudget, deleteBudget, listBudgets, updateBudget]) mock.mockReset()
  listBudgets.mockResolvedValue([])
})

describe('budget list (US-32)', () => {
  it('shows a loading message while budgets load', async () => {
    listBudgets.mockReturnValue(deferred().promise)
    renderApp('/budgets')

    expect(await screen.findByText('Loading budgets…')).toBeInTheDocument()
  })

  it('has a row for every category, in order, with its limit or "No limit set"', async () => {
    await showBudgets()

    const names = within(budgetList()).getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(names).toEqual(['Food', 'Transportation', 'Housing', 'Entertainment', 'Other'])
    expect(rowFor('Food')).toHaveTextContent('$500.00 a month')
    expect(rowFor('Housing')).toHaveTextContent('$1,800.00 a month')
    expect(rowFor('Transportation')).toHaveTextContent('No limit set')
    expect(screen.getByText('2 of 5 categories have a monthly limit.')).toBeInTheDocument()
  })

  it('shows each category as its coloured label', async () => {
    await showBudgets()

    expect(within(rowFor('Food')).getByText('Food')).toHaveClass('category-label')
  })

  it('offers Edit and Remove on a row with a limit, and Set limit on one without, each naming the category', async () => {
    await showBudgets()

    expect(within(rowFor('Food')).getByRole('button', { name: 'Edit Food limit' })).toBeInTheDocument()
    expect(within(rowFor('Food')).getByRole('button', { name: 'Remove Food limit' })).toBeInTheDocument()
    expect(within(rowFor('Other')).getByRole('button', { name: 'Set limit for Other' })).toBeInTheDocument()
    expect(within(rowFor('Other')).queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })

  it('says when no limits are set yet', async () => {
    await showBudgets([])

    expect(screen.getByText("You haven't set any limits yet. Choose Set limit next to a category to add one.")).toBeInTheDocument()
  })

  it('shows an error with Try again, which loads the budgets again', async () => {
    listBudgets.mockRejectedValueOnce(new ApiError('network', "We couldn't reach the server. Check your connection and try again."))
    listBudgets.mockResolvedValueOnce([FOOD])
    renderApp('/budgets')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't load your budgets. We couldn't reach the server. Check your connection and try again."
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('$500.00 a month')).toBeInTheDocument()
    expect(listBudgets).toHaveBeenCalledTimes(2)
  })

  it('offers Sign in again, not Try again, when the session has ended', async () => {
    listBudgets.mockRejectedValue(SESSION_ENDED)
    renderApp('/budgets')

    expect(await screen.findByRole('link', { name: 'Sign in again.' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})

describe('setting and editing a limit (US-32)', () => {
  it('sets a limit for a category without one, and says it was saved', async () => {
    createBudget.mockImplementation(async (payload) => ({ id: '9', user_id: 'u', ...payload }))
    await showBudgets()

    const input = await openForm('Other')
    expect(input).toHaveFocus()
    expect(input).toHaveValue('')
    fireEvent.change(input, { target: { value: '75' } })
    submit('Other')

    expect(await within(rowFor('Other')).findByText('$75.00 a month')).toBeInTheDocument()
    expect(createBudget).toHaveBeenCalledWith({ category: 'Other', limit_cents: 7500 })
    expect(within(rowFor('Other')).getByRole('status')).toHaveTextContent('Other limit saved: $75.00 a month.')
    // Focus moves in an effect after the saved row is on screen, which on a slow machine
    // runs in a later task than the text appearing.
    await waitFor(() => expect(within(rowFor('Other')).getByRole('button', { name: 'Edit Other limit' })).toHaveFocus())
  })

  it('edits a limit, starting from the saved value', async () => {
    updateBudget.mockImplementation(async (id, payload) => ({ ...FOOD, ...payload }))
    await showBudgets()

    const input = await openForm('Food')
    expect(input).toHaveValue('500.00')
    fireEvent.change(input, { target: { value: '1,250.50' } })
    submit('Food')

    expect(await within(rowFor('Food')).findByText('$1,250.50 a month')).toBeInTheDocument()
    expect(updateBudget).toHaveBeenCalledWith('7', { limit_cents: 125050 })
    expect(createBudget).not.toHaveBeenCalled()
  })

  it.each([
    ['Cancel', () => fireEvent.click(within(rowFor('Food')).getByRole('button', { name: 'Cancel' }))],
    ['Escape', (input) => fireEvent.keyDown(input, { key: 'Escape' })],
  ])('%s closes the form without saving and returns focus to Edit', async (_, close) => {
    await showBudgets()
    const input = await openForm('Food')
    fireEvent.change(input, { target: { value: '9' } })

    close(input)

    expect(within(rowFor('Food')).queryByLabelText('Monthly limit for Food ($)')).not.toBeInTheDocument()
    expect(rowFor('Food')).toHaveTextContent('$500.00 a month')
    expect(updateBudget).not.toHaveBeenCalled()
    await waitFor(() => expect(within(rowFor('Food')).getByRole('button', { name: 'Edit Food limit' })).toHaveFocus())
  })

  it('locks the form while saving, so nothing is sent twice', async () => {
    const save = deferred()
    createBudget.mockReturnValue(save.promise)
    await showBudgets()
    const input = await openForm('Other')
    fireEvent.change(input, { target: { value: '10' } })

    submit('Other')
    fireEvent.submit(input.closest('form'))

    expect(within(rowFor('Other')).getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(within(rowFor('Other')).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(createBudget).toHaveBeenCalledTimes(1)
    await act(async () => save.resolve({ id: '9', category: 'Other', limit_cents: 1000 }))
  })

  it('keeps the typed value and shows a plain message when saving fails', async () => {
    createBudget.mockRejectedValue(SERVER_ERROR)
    await showBudgets()
    const input = await openForm('Other')
    fireEvent.change(input, { target: { value: '20' } })

    submit('Other')

    expect(await within(rowFor('Other')).findByRole('alert')).toHaveTextContent(
      'The limit was not saved. Something went wrong on our end. Please try again in a moment.'
    )
    expect(input).toHaveValue('20')
  })

  it('shows Sign in again when the session has ended while saving', async () => {
    createBudget.mockRejectedValue(SESSION_ENDED)
    await showBudgets()
    fireEvent.change(await openForm('Other'), { target: { value: '20' } })

    submit('Other')

    expect(await within(rowFor('Other')).findByRole('link', { name: 'Sign in again.' })).toBeInTheDocument()
  })

  it('removes the limit from the list when it was deleted somewhere else', async () => {
    updateBudget.mockRejectedValue(NOT_FOUND)
    await showBudgets()
    listBudgets.mockResolvedValue([HOUSING])
    fireEvent.change(await openForm('Food'), { target: { value: '600' } })

    submit('Food')

    expect(await within(rowFor('Food')).findByText('No limit set')).toBeInTheDocument()
    expect(within(rowFor('Food')).getByRole('status')).toHaveTextContent(
      'That Food limit no longer exists, so it was removed from the list.'
    )
    await waitFor(() => expect(listBudgets).toHaveBeenCalledTimes(2))
  })
})

describe('blocking invalid limits (US-33)', () => {
  it.each(['', '0', '0.00', '-1', '-25', 'abc', '   '])('blocks %j with a clear message and sends nothing', async (value) => {
    await showBudgets()
    const input = await openForm('Other')
    fireEvent.change(input, { target: { value } })

    submit('Other')

    expect(input).toHaveAccessibleDescription(expect.stringContaining('Enter a limit greater than zero.'))
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveFocus()
    expect(createBudget).not.toHaveBeenCalled()
  })

  it('blocks more than two decimal places', async () => {
    await showBudgets()
    const input = await openForm('Other')
    fireEvent.change(input, { target: { value: '1.005' } })

    submit('Other')

    expect(input).toHaveAccessibleDescription(expect.stringContaining('Use at most two decimal places, like 500.00.'))
    expect(createBudget).not.toHaveBeenCalled()
  })

  it('clears the message as soon as the limit is fixed', async () => {
    await showBudgets()
    const input = await openForm('Other')
    submit('Other')
    expect(within(rowFor('Other')).getByText('Enter a limit greater than zero.')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '12' } })

    expect(within(rowFor('Other')).queryByText('Enter a limit greater than zero.')).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it.each([
    ['1', 100],
    ['1.5', 150],
    ['1.05', 105],
    ['0.01', 1],
    ['1,000.00', 100000],
    ['$12', 1200],
    ['  40  ', 4000],
  ])('sends %j as %i cents', async (value, cents) => {
    createBudget.mockImplementation(async (payload) => ({ id: '9', ...payload }))
    await showBudgets()
    fireEvent.change(await openForm('Other'), { target: { value } })

    submit('Other')

    await waitFor(() => expect(createBudget).toHaveBeenCalledWith({ category: 'Other', limit_cents: cents }))
  })

  it('shows the API’s message on the field if it still rejects the limit', async () => {
    createBudget.mockRejectedValue(
      new ApiError('validation', 'Some details need fixing. Check the highlighted fields.', {
        fieldErrors: { limit_cents: 'limit_cents must be greater than zero.' },
      })
    )
    await showBudgets()
    const input = await openForm('Other')
    fireEvent.change(input, { target: { value: '5' } })

    submit('Other')

    expect(await within(rowFor('Other')).findByText('Limit must be greater than zero.')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows the API’s 409 message for a duplicate, then reloads so the next Save changes that limit', async () => {
    createBudget.mockRejectedValue(CONFLICT)
    updateBudget.mockImplementation(async (id, payload) => ({ ...FOOD, ...payload }))
    await showBudgets([HOUSING])
    listBudgets.mockResolvedValue([FOOD, HOUSING])
    const input = await openForm('Food')
    fireEvent.change(input, { target: { value: '300' } })

    submit('Food')

    expect(await within(rowFor('Food')).findByRole('alert')).toHaveTextContent(
      'The limit was not saved. You already have a budget for Food. Change that one instead.'
    )
    expect(await within(rowFor('Food')).findByText('$500.00 a month')).toBeInTheDocument()
    expect(listBudgets).toHaveBeenCalledTimes(2)
    expect(input).toHaveValue('300')

    submit('Food')

    await waitFor(() => expect(updateBudget).toHaveBeenCalledWith('7', { limit_cents: 30000 }))
    expect(await within(rowFor('Food')).findByText('$300.00 a month')).toBeInTheDocument()
  })
})

describe('removing a limit (US-32)', () => {
  async function openRemove(category) {
    fireEvent.click(within(rowFor(category)).getByRole('button', { name: `Remove ${category} limit` }))
    return screen.findByRole('dialog')
  }

  it('asks for confirmation with Cancel focused', async () => {
    await showBudgets()

    const dialog = await openRemove('Food')

    expect(dialog).toHaveAccessibleName('Remove the Food limit?')
    expect(dialog).toHaveTextContent('Your $500.00 monthly limit for Food will be removed.')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(deleteBudget).not.toHaveBeenCalled()
  })

  it.each([
    ['Cancel', (dialog) => fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))],
    ['Escape', (dialog) => fireEvent.keyDown(dialog, { key: 'Escape' })],
  ])('%s keeps the limit and returns focus to Remove', async (_, close) => {
    await showBudgets()
    const dialog = await openRemove('Food')

    close(dialog)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(rowFor('Food')).toHaveTextContent('$500.00 a month')
    await waitFor(() => expect(within(rowFor('Food')).getByRole('button', { name: 'Remove Food limit' })).toHaveFocus())
  })

  it('removes the limit once confirmed, says so, and moves focus to Set limit', async () => {
    deleteBudget.mockResolvedValue(undefined)
    await showBudgets()
    const dialog = await openRemove('Food')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove limit' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(deleteBudget).toHaveBeenCalledWith('7')
    expect(rowFor('Food')).toHaveTextContent('No limit set')
    expect(within(rowFor('Food')).getByRole('status')).toHaveTextContent('Food limit removed.')
    await waitFor(() => expect(within(rowFor('Food')).getByRole('button', { name: 'Set limit for Food' })).toHaveFocus())
  })

  it('says so when the limit was already removed somewhere else', async () => {
    deleteBudget.mockRejectedValue(NOT_FOUND)
    await showBudgets()
    listBudgets.mockResolvedValue([HOUSING])
    const dialog = await openRemove('Food')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove limit' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(rowFor('Food')).getByRole('status')).toHaveTextContent('That Food limit was already removed.')
    expect(rowFor('Food')).toHaveTextContent('No limit set')
  })

  it('keeps the limit and explains when removing fails for another reason', async () => {
    deleteBudget.mockRejectedValue(SERVER_ERROR)
    await showBudgets()
    const dialog = await openRemove('Food')
    // A real click focuses the button; fireEvent.click doesn't.
    const remove = within(dialog).getByRole('button', { name: 'Remove limit' })
    remove.focus()

    fireEvent.click(remove)

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The limit was not removed. Something went wrong on our end. Please try again in a moment.'
    )
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus())
    expect(rowFor('Food')).toHaveTextContent('$500.00 a month')
  })

  it('locks the dialog while removing', async () => {
    const request = deferred()
    deleteBudget.mockReturnValue(request.promise)
    await showBudgets()
    const dialog = await openRemove('Food')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove limit' }))

    expect(within(dialog).getByRole('button', { name: 'Removing…' })).toBeDisabled()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(deleteBudget).toHaveBeenCalledTimes(1)
    await act(async () => request.resolve())
  })
})
