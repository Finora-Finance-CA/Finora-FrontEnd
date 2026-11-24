// US-52: the add and edit transaction forms check every rule from validation-rules.md
// before anything is sent: on blur and on submit, with the message under its field,
// aria-invalid and aria-describedby set, and focus on the first invalid field. Dollars
// become integer cents without floating point, and the API's 400 messages go under
// their fields.

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { createTransaction, listTransactions } from '../api/transactions'
import { renderApp } from '../test/renderApp'
import { findToast } from '../test/toasts'
import { pageOf } from '../test/transactions'

vi.mock('../api/transactions')

async function openAdd() {
  renderApp('/transactions')
  fireEvent.click(await screen.findByRole('button', { name: 'Add transaction' }))
  return screen.getByRole('dialog', { name: 'Add expense' })
}

function field(drawer, label) {
  return within(drawer).getByLabelText(label)
}

function fill(drawer, { amount, date, category, description } = {}) {
  if (amount !== undefined) fireEvent.change(field(drawer, 'Amount ($)'), { target: { value: amount } })
  if (date !== undefined) fireEvent.change(field(drawer, 'Date'), { target: { value: date } })
  if (category !== undefined) fireEvent.change(field(drawer, 'Category'), { target: { value: category } })
  if (description !== undefined) fireEvent.change(field(drawer, 'Description (optional)'), { target: { value: description } })
}

function save(drawer) {
  fireEvent.click(within(drawer).getByRole('button', { name: 'Save expense' }))
}

beforeEach(() => {
  listTransactions.mockReset().mockResolvedValue(pageOf([]))
  createTransaction.mockReset().mockImplementation(async (payload) => ({ id: '9', ...payload }))
})

describe('the transaction form blocks invalid input (US-52)', () => {
  it.each([
    ['an empty amount', { amount: '', category: 'Food' }, 'Amount ($)', 'Amount is required.'],
    ['a zero amount', { amount: '0', category: 'Food' }, 'Amount ($)', 'Amount must be greater than 0.'],
    ['a negative amount', { amount: '-12.50', category: 'Food' }, 'Amount ($)', 'Amount must be greater than 0.'],
    ['a non-numeric amount', { amount: '12abc', category: 'Food' }, 'Amount ($)', 'Amount must be a number, for example 12.50.'],
    ['too many decimals', { amount: '12.345', category: 'Food' }, 'Amount ($)', 'Amount can have at most 2 decimal places, for example 12.50.'],
    ['a huge amount', { amount: '99999999', category: 'Food' }, 'Amount ($)', 'Amount must be $21,474,836.47 or less.'],
    ['a missing date', { amount: '5', date: '', category: 'Food' }, 'Date', 'Date is required.'],
    ['a date before 1900', { amount: '5', date: '1899-12-31', category: 'Food' }, 'Date', 'Date must be between 1900-01-01 and 2100-12-31.'],
    ['a date after 2100', { amount: '5', date: '2101-01-01', category: 'Food' }, 'Date', 'Date must be between 1900-01-01 and 2100-12-31.'],
    ['a missing category', { amount: '5' }, 'Category', 'Category is required for an expense.'],
    ['a description over 255 characters', { amount: '5', category: 'Food', description: 'a'.repeat(256) }, 'Description (optional)', 'Description must be 255 characters or fewer.'],
  ])('blocks %s with a message under the field and sends nothing', async (_, values, label, message) => {
    const drawer = await openAdd()
    fill(drawer, values)

    save(drawer)

    const input = field(drawer, label)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(expect.stringContaining(message))
    expect(input).toHaveFocus()
    expect(createTransaction).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Add expense' })).toBeInTheDocument()
  })

  it('shows every invalid field at once and focuses the first one on screen', async () => {
    const drawer = await openAdd()
    fill(drawer, { amount: '', date: '' })

    save(drawer)

    expect(field(drawer, 'Amount ($)')).toHaveAccessibleDescription(expect.stringContaining('Amount is required.'))
    expect(field(drawer, 'Date')).toHaveAccessibleDescription(expect.stringContaining('Date is required.'))
    expect(field(drawer, 'Category')).toHaveAccessibleDescription(expect.stringContaining('Category is required for an expense.'))
    expect(field(drawer, 'Amount ($)')).toHaveFocus()
  })

  it('checks a field when the user leaves it, but not an untouched one', async () => {
    const drawer = await openAdd()

    fireEvent.blur(field(drawer, 'Amount ($)'))
    expect(field(drawer, 'Amount ($)')).not.toHaveAttribute('aria-invalid')

    fireEvent.change(field(drawer, 'Amount ($)'), { target: { value: '-3' } })
    fireEvent.blur(field(drawer, 'Amount ($)'))

    expect(field(drawer, 'Amount ($)')).toHaveAttribute('aria-invalid', 'true')
    expect(field(drawer, 'Amount ($)')).toHaveAccessibleDescription(expect.stringContaining('Amount must be greater than 0.'))
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('removes the message as soon as the field is fixed', async () => {
    const drawer = await openAdd()
    fill(drawer, { amount: 'abc' })
    fireEvent.blur(field(drawer, 'Amount ($)'))

    fill(drawer, { amount: '12.50' })

    expect(field(drawer, 'Amount ($)')).not.toHaveAttribute('aria-invalid')
    expect(within(drawer).queryByText('Amount must be a number, for example 12.50.')).not.toBeInTheDocument()
  })

  it.each([
    ['0.01', 1],
    ['19.99', 1999],
    ['0.29', 29],
    ['$1,234.56', 123456],
    ['21474836.47', 2_147_483_647],
  ])('sends %j as exactly %i cents', async (amount, cents) => {
    const drawer = await openAdd()
    fill(drawer, { amount, category: 'Food', date: '2024-02-29' })

    save(drawer)

    await waitFor(() =>
      expect(createTransaction).toHaveBeenCalledWith({ amount_cents: cents, date: '2024-02-29', type: 'expense', category: 'Food' })
    )
  })

  it('puts the API’s 400 messages under their fields, and never shows text for fields it does not have', async () => {
    createTransaction.mockRejectedValue(
      new ApiError('validation', 'Some details need fixing. Check the highlighted fields.', {
        status: 400,
        fieldErrors: { date: 'Date must be a real calendar date.', type: 'Type must be income or expense.' },
      })
    )
    const drawer = await openAdd()
    fill(drawer, { amount: '5', category: 'Food' })

    save(drawer)

    expect(await within(drawer).findByText('Date must be a real calendar date.')).toBeInTheDocument()
    expect(field(drawer, 'Date')).toHaveAttribute('aria-invalid', 'true')
    expect(field(drawer, 'Date')).toHaveFocus()
    expect(within(drawer).getByRole('alert')).toHaveTextContent("This couldn't be saved. Check the details and try again.")
    expect(within(drawer).queryByText(/Type must be/)).not.toBeInTheDocument()
  })

  it('keeps everything typed when the save fails', async () => {
    createTransaction.mockRejectedValue(new ApiError('network', "We couldn't reach the server. Check your connection and try again."))
    const drawer = await openAdd()
    fill(drawer, { amount: '42.10', date: '2026-10-05', category: 'Housing', description: 'Rent share' })

    save(drawer)

    expect(await within(drawer).findByRole('alert')).toHaveTextContent("We couldn't reach the server. Check your connection and try again.")
    expect(field(drawer, 'Amount ($)')).toHaveValue('42.10')
    expect(field(drawer, 'Date')).toHaveValue('2026-10-05')
    expect(field(drawer, 'Category')).toHaveValue('Housing')
    expect(field(drawer, 'Description (optional)')).toHaveValue('Rent share')
  })

  it('confirms a save with a short toast', async () => {
    const drawer = await openAdd()
    fill(drawer, { amount: '12.50', category: 'Food' })

    save(drawer)

    expect(await findToast('Expense of $12.50 added.')).toBeInTheDocument()
  })

  it('limits the date picker to the range the API accepts', async () => {
    const drawer = await openAdd()

    expect(field(drawer, 'Date')).toHaveAttribute('min', '1900-01-01')
    expect(field(drawer, 'Date')).toHaveAttribute('max', '2100-12-31')
  })
})
