// The transactions page as a user sees it: the list and its states, paging, search
// and filters, and adding, editing and deleting. The API module is mocked; nothing
// leaves the test.

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from '../api/transactions'
import { endSession } from '../test/fakeSupabase'
import { currentPath, currentSearch, renderApp } from '../test/renderApp'
import { makeTransaction, NO_FILTERS, pageOf, savedFrom } from '../test/transactions'

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

// The header's navigation is a list too, so look inside the history section.
function historySection() {
  return screen.getByRole('region', { name: 'Transaction history' })
}

function transactionList() {
  return within(historySection()).getByRole('list')
}

function rowFor(description) {
  return within(transactionList()).getByText(description).closest('li')
}

function descriptionsInList() {
  return within(transactionList())
    .getAllByRole('listitem')
    .map((row) => row.querySelector('.transaction-row__description').textContent)
}

async function showList(transactions = [LUNCH, SALARY, RENT], path) {
  listTransactions.mockResolvedValue(pageOf(transactions))
  renderApp(path)
  await within(await screen.findByRole('region', { name: 'Transaction history' })).findByRole('list')
}

function statusMessage() {
  return screen.getAllByRole('status').map((element) => element.textContent).join(' ')
}

function lastQuery() {
  return listTransactions.mock.lastCall[0]
}

function searchBox() {
  return screen.getByRole('searchbox', { name: 'Search descriptions' })
}

function historyHeading() {
  return screen.getByRole('heading', { name: 'Transaction history' })
}

/** n transactions with descriptions "t1" to "tn", for paging tests. */
function manyTransactions(n, start = 1) {
  return Array.from({ length: n }, (_, i) => makeTransaction({ id: String(500 + start + i), description: `t${start + i}` }))
}

beforeEach(() => {
  // vi.mock's functions keep queued mockResolvedValueOnce values between tests, so
  // start each test from nothing.
  for (const mock of [createTransaction, deleteTransaction, listTransactions, updateTransaction]) mock.mockReset()
  listTransactions.mockResolvedValue(pageOf([]))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('transaction list states', () => {
  it('shows a loading message while the list loads', async () => {
    listTransactions.mockReturnValue(deferred().promise)
    renderApp()

    expect(await screen.findByText('Loading transactions…')).toBeInTheDocument()
  })

  it('asks for the first page with no filters', async () => {
    await showList()

    expect(listTransactions).toHaveBeenCalledWith(NO_FILTERS)
  })

  it('offers to add a first transaction when there are none, and the button goes to the form', async () => {
    renderApp()

    expect(await screen.findByText("You haven't added any transactions yet.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add your first transaction' }))

    expect(screen.getByLabelText('Amount ($)')).toHaveFocus()
  })

  it('shows each transaction in the API’s order, with date, type, category, description and amount', async () => {
    await showList([LUNCH, SALARY, RENT])

    expect(descriptionsInList()).toEqual(['Lunch', 'Salary', 'Rent'])

    const lunch = rowFor('Lunch')
    expect(lunch).toHaveTextContent('Oct 5, 2026')
    expect(lunch).toHaveTextContent('Expense')
    expect(lunch).toHaveTextContent('−$12.50')
    expect(within(lunch).getByText('Food')).toHaveClass('category-label')

    const salary = rowFor('Salary')
    expect(salary).toHaveTextContent('Income')
    expect(salary).toHaveTextContent('+$2,000.00')
    expect(salary.querySelector('.category-label')).toBeNull()
  })

  it('marks income and expenses differently, with text and a sign as well as colour', async () => {
    await showList([LUNCH, SALARY])

    expect(rowFor('Salary')).toHaveClass('transaction-row--income')
    expect(rowFor('Lunch')).toHaveClass('transaction-row--expense')
    expect(within(rowFor('Salary')).getByText('Income')).toBeInTheDocument()
    expect(within(rowFor('Lunch')).getByText('Expense')).toBeInTheDocument()
  })

  it('shows a category label on an income that has one', async () => {
    await showList([makeTransaction({ type: 'income', category: 'Other', description: 'Refund' })])

    expect(within(rowFor('Refund')).getByText('Other')).toHaveClass('category-label')
  })

  it('says how many transactions there are', async () => {
    await showList()

    expect(statusMessage()).toContain('Showing 3 transactions.')
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
    listTransactions.mockResolvedValueOnce(pageOf([LUNCH]))
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

describe('paging (US-22)', () => {
  it('shows which transactions are on screen and Previous and Next', async () => {
    listTransactions.mockResolvedValue(pageOf(manyTransactions(20), { total_count: 45 }))
    renderApp()

    const pages = await screen.findByRole('navigation', { name: 'Transaction pages' })
    expect(statusMessage()).toContain('Showing 1 to 20 of 45 transactions.')
    expect(pages).toHaveTextContent('Page 1 of 3')
    expect(within(pages).getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(within(pages).getByRole('button', { name: 'Next page' })).toBeEnabled()
  })

  it('loads the next page, puts it in the URL and moves focus to the top of the list', async () => {
    listTransactions.mockResolvedValueOnce(pageOf(manyTransactions(20), { total_count: 45 }))
    listTransactions.mockResolvedValueOnce(pageOf(manyTransactions(20, 21), { page: 2, total_count: 45 }))
    renderApp()
    await screen.findByText('t1')

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByText('t21')).toBeInTheDocument()
    expect(lastQuery()).toEqual({ ...NO_FILTERS, page: 2 })
    expect(currentPath()).toBe('/transactions')
    expect(currentSearch()).toBe('?page=2')
    expect(statusMessage()).toContain('Showing 21 to 40 of 45 transactions.')
    expect(historyHeading()).toHaveFocus()
  })

  it('opens the page given in the URL, and Previous goes back one', async () => {
    listTransactions.mockResolvedValueOnce(pageOf(manyTransactions(5, 41), { page: 3, total_count: 45 }))
    listTransactions.mockResolvedValueOnce(pageOf(manyTransactions(20, 21), { page: 2, total_count: 45 }))
    renderApp('/transactions?page=3')
    await screen.findByText('t41')

    expect(listTransactions).toHaveBeenCalledWith({ ...NO_FILTERS, page: 3 })
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))

    expect(await screen.findByText('t21')).toBeInTheDocument()
    expect(lastQuery()).toEqual({ ...NO_FILTERS, page: 2 })
  })

  it('has no paging controls when everything fits on one page', async () => {
    await showList()

    expect(screen.queryByRole('navigation', { name: 'Transaction pages' })).not.toBeInTheDocument()
  })

  it('ignores a page number in the URL that is not a whole number', async () => {
    await showList([LUNCH], '/transactions?page=abc')

    expect(listTransactions).toHaveBeenCalledWith(NO_FILTERS)
  })

  it('steps back a page when a delete empties the last one', async () => {
    const onlyOne = makeTransaction({ id: '99', description: 'Last one' })
    listTransactions.mockResolvedValueOnce(pageOf([onlyOne], { page: 3, total_count: 41 }))
    listTransactions.mockResolvedValueOnce(pageOf([], { page: 3, total_count: 40 }))
    listTransactions.mockResolvedValueOnce(pageOf(manyTransactions(20, 21), { page: 2, total_count: 40 }))
    deleteTransaction.mockResolvedValue(undefined)
    renderApp('/transactions?page=3')
    await screen.findByText('Last one')

    fireEvent.click(within(rowFor('Last one')).getByRole('button', { name: /^Delete/ }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('t21')).toBeInTheDocument()
    expect(listTransactions).toHaveBeenLastCalledWith({ ...NO_FILTERS, page: 2 })
    expect(screen.queryByText("You haven't added any transactions yet.")).not.toBeInTheDocument()
  })
})

describe('search (US-23)', () => {
  it('searches 300ms after the last keystroke, from page 1', async () => {
    await showList([LUNCH], '/transactions?page=2')
    vi.useFakeTimers()
    const callsBefore = listTransactions.mock.calls.length

    fireEvent.change(searchBox(), { target: { value: 'Lun' } })
    act(() => vi.advanceTimersByTime(200))
    fireEvent.change(searchBox(), { target: { value: 'Lunch' } })
    act(() => vi.advanceTimersByTime(299))
    expect(listTransactions).toHaveBeenCalledTimes(callsBefore)

    act(() => vi.advanceTimersByTime(1))
    expect(listTransactions).toHaveBeenCalledTimes(callsBefore + 1)
    expect(lastQuery()).toEqual({ ...NO_FILTERS, q: 'Lunch' })
  })

  it('searches straight away on Enter', async () => {
    await showList()

    fireEvent.change(searchBox(), { target: { value: '  rent ' } })
    fireEvent.submit(screen.getByRole('search', { name: 'Search and filter transactions' }))

    await waitFor(() => expect(lastQuery()).toEqual({ ...NO_FILTERS, q: 'rent' }))
  })

  it('keeps the search from the URL in the box', async () => {
    await showList([LUNCH], '/transactions?q=lunch')

    expect(searchBox()).toHaveValue('lunch')
    expect(listTransactions).toHaveBeenCalledWith({ ...NO_FILTERS, q: 'lunch' })
    expect(statusMessage()).toContain('Showing 1 transaction that match your search and filters.')
  })

  it('says when nothing matches, and Clear all filters brings the list back', async () => {
    listTransactions.mockImplementation(async (query) => (query.q ? pageOf([]) : pageOf([LUNCH, SALARY])))
    renderApp('/transactions?q=zzz')

    expect(await screen.findByText('No transactions match your search and filters.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))

    expect(await screen.findByText('Lunch')).toBeInTheDocument()
    expect(lastQuery()).toEqual(NO_FILTERS)
    expect(searchBox()).toHaveValue('')
    expect(searchBox()).toHaveFocus()
  })
})

describe('category filter (US-24)', () => {
  it('shows only the chosen categories, and adding one keeps the first', async () => {
    await showList()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Housing' }))
    await waitFor(() => expect(lastQuery()).toEqual({ ...NO_FILTERS, categories: ['Housing'] }))

    fireEvent.click(screen.getByRole('checkbox', { name: 'Food' }))
    await waitFor(() => expect(lastQuery()).toEqual({ ...NO_FILTERS, categories: ['Food', 'Housing'] }))
    expect(screen.getByRole('checkbox', { name: 'Food' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Housing' })).toBeChecked()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Housing' }))
    await waitFor(() => expect(lastQuery()).toEqual({ ...NO_FILTERS, categories: ['Food'] }))
  })

  it('reads categories from the URL and drops unknown ones', async () => {
    await showList([RENT], '/transactions?category=Housing&category=Bogus')

    expect(listTransactions).toHaveBeenCalledWith({ ...NO_FILTERS, categories: ['Housing'] })
    expect(screen.getByRole('checkbox', { name: 'Housing' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Food' })).not.toBeChecked()
  })

  it('groups the category checkboxes under one label', async () => {
    await showList()

    expect(screen.getByRole('group', { name: 'Categories (choose any)' })).toBeInTheDocument()
  })

  it('goes back to page 1 when a category is chosen', async () => {
    await showList([LUNCH], '/transactions?page=2')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Food' }))

    await waitFor(() => expect(lastQuery()).toEqual({ ...NO_FILTERS, categories: ['Food'] }))
  })
})

describe('date range filter (US-25)', () => {
  it('sends the From and To dates', async () => {
    await showList()

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01' } })
    await waitFor(() => expect(lastQuery()).toEqual({ ...NO_FILTERS, from: '2026-09-01' }))

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-30' } })
    await waitFor(() => expect(lastQuery()).toEqual({ ...NO_FILTERS, from: '2026-09-01', to: '2026-09-30' }))
  })

  it('explains a To date before the From date, and does not ask the API', async () => {
    await showList([LUNCH], '/transactions?from=2026-09-30')
    const calls = listTransactions.mock.calls.length

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01' } })

    expect(await screen.findByText('The To date is before the From date. Change one of them to see your transactions.')).toBeInTheDocument()
    expect(screen.getByLabelText('To')).toHaveAccessibleDescription('Choose a date on or after the From date.')
    expect(screen.getByLabelText('To')).toHaveAttribute('aria-invalid', 'true')
    expect(listTransactions).toHaveBeenCalledTimes(calls)
  })

  it('ignores a date in the URL that is not a real date', async () => {
    await showList([LUNCH], '/transactions?from=2026-02-30&to=soon')

    expect(listTransactions).toHaveBeenCalledWith(NO_FILTERS)
  })
})

describe('search and filters together, and Clear all (US-26)', () => {
  const EVERYTHING = '/transactions?q=lunch&category=Food&category=Other&from=2026-09-01&to=2026-09-30&page=2'

  it('sends every filter at once and shows them all on the form', async () => {
    await showList([LUNCH], EVERYTHING)

    expect(listTransactions).toHaveBeenCalledWith({
      page: 2,
      q: 'lunch',
      categories: ['Food', 'Other'],
      from: '2026-09-01',
      to: '2026-09-30',
    })
    expect(searchBox()).toHaveValue('lunch')
    expect(screen.getByRole('checkbox', { name: 'Food' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Other' })).toBeChecked()
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-01')
    expect(screen.getByLabelText('To')).toHaveValue('2026-09-30')
  })

  it('keeps the other filters when one changes', async () => {
    await showList([LUNCH], EVERYTHING)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Other' }))

    await waitFor(() =>
      expect(lastQuery()).toEqual({ page: 1, q: 'lunch', categories: ['Food'], from: '2026-09-01', to: '2026-09-30' })
    )
  })

  it('Clear all resets search, categories, dates and page, and focuses the search box', async () => {
    await showList([LUNCH], EVERYTHING)

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    await waitFor(() => expect(lastQuery()).toEqual(NO_FILTERS))
    expect(searchBox()).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'Food' })).not.toBeChecked()
    expect(screen.getByLabelText('From')).toHaveValue('')
    expect(screen.getByLabelText('To')).toHaveValue('')
    expect(searchBox()).toHaveFocus()
  })

  it('Clear all also clears search text that has not been searched yet', async () => {
    await showList()
    fireEvent.change(searchBox(), { target: { value: 'half typed' } })

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(searchBox()).toHaveValue('')
  })

  it('disables Clear all when there is nothing to clear', async () => {
    await showList()

    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled()
  })
})

describe('adding a transaction', () => {
  it('loads the list again so the new transaction shows', async () => {
    const coffee = makeTransaction({ id: '50', description: 'Coffee', date: '2026-10-09' })
    createTransaction.mockImplementation(async (payload) => savedFrom(payload, { id: '50', date: '2026-10-09' }))
    await showList()
    listTransactions.mockResolvedValue(pageOf([coffee, LUNCH, SALARY, RENT]))

    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '4.75' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } })
    fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'Coffee' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(await within(transactionList()).findByText('Coffee')).toBeInTheDocument()
    expect(descriptionsInList()).toEqual(['Coffee', 'Lunch', 'Salary', 'Rent'])
    expect(listTransactions).toHaveBeenCalledTimes(2)
    expect(lastQuery()).toEqual(NO_FILTERS)
  })

  it('keeps the current filters and page when it reloads', async () => {
    createTransaction.mockImplementation(async (payload) => savedFrom(payload))
    await showList([LUNCH], '/transactions?category=Food&page=2')

    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '4.75' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    await waitFor(() => expect(listTransactions).toHaveBeenCalledTimes(2))
    expect(lastQuery()).toEqual({ ...NO_FILTERS, page: 2, categories: ['Food'] })
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

    await act(async () => secondLoad.resolve(pageOf([coffee, LUNCH])))
    await act(async () => firstLoad.resolve(pageOf([LUNCH])))

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

  it('lists every category in the edit dialog’s dropdown', async () => {
    await showList()

    const dialog = await openEdit('Lunch')

    const options = within(within(dialog).getByLabelText('Category')).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Choose a category',
      'Food',
      'Transportation',
      'Housing',
      'Entertainment',
      'Other',
    ])
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

  it('shows the change in its row at once, then reloads the page to put it in place', async () => {
    updateTransaction.mockImplementation(async (id, payload) => savedFrom(payload, { id }))
    await showList()
    const reload = deferred()
    listTransactions.mockReturnValue(reload.promise)
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
    expect(descriptionsInList()).toEqual(['Lunch', 'Salary', 'Rent and parking'])
    const row = rowFor('Rent and parking')
    expect(row).toHaveTextContent('Oct 8, 2026')
    expect(row).toHaveTextContent('Other')
    expect(row).toHaveTextContent('−$1,000.50')
    expect(statusMessage()).toContain('Transaction updated.')
    await waitFor(() => expect(within(row).getByRole('button', { name: /^Edit/ })).toHaveFocus())

    const moved = savedFrom({ amount_cents: 100050, date: '2026-10-08', type: 'expense', category: 'Other', description: 'Rent and parking' }, { id: '3' })
    await act(async () => reload.resolve(pageOf([moved, LUNCH, SALARY])))
    expect(descriptionsInList()).toEqual(['Rent and parking', 'Lunch', 'Salary'])
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
    listTransactions.mockResolvedValue(pageOf([SALARY, RENT]))
    const dialog = await openEdit('Lunch')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText('Lunch')).not.toBeInTheDocument()
    expect(statusMessage()).toContain('That transaction no longer exists, so it was removed from the list.')
    await waitFor(() => expect(historyHeading()).toHaveFocus())
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

  it('removes the transaction at once, then reloads the same page', async () => {
    deleteTransaction.mockResolvedValue(undefined)
    await showList()
    listTransactions.mockReturnValue(deferred().promise)
    const dialog = await openDelete('Rent')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(deleteTransaction).toHaveBeenCalledWith('3')
    expect(descriptionsInList()).toEqual(['Lunch', 'Salary'])
    expect(statusMessage()).toContain('Transaction deleted.')
    expect(listTransactions).toHaveBeenCalledTimes(2)
    expect(lastQuery()).toEqual(NO_FILTERS)
    await waitFor(() => expect(historyHeading()).toHaveFocus())
  })

  it('removes the row and says so when it was already deleted', async () => {
    deleteTransaction.mockRejectedValue(NOT_FOUND)
    await showList()
    listTransactions.mockResolvedValue(pageOf([LUNCH, SALARY]))
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
