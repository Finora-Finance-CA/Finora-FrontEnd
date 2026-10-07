import { describe, expect, it } from 'vitest'
import { TRANSACTION_TYPES } from './constants'
import { mapApiErrors, toTransactionPayload, validateField, validateTransactionForm } from './validation'

const EXPENSE = { categoryRequired: true, fields: TRANSACTION_TYPES.expense.fields }
const INCOME = { categoryRequired: false, fields: TRANSACTION_TYPES.income.fields }
const VALID = { amount: '12.50', date: '2026-10-05', category: 'Food', description: 'Lunch' }

describe('validateTransactionForm', () => {
  it('accepts a valid expense', () => {
    expect(validateTransactionForm(VALID, EXPENSE)).toEqual({})
  })

  it('reports every invalid field of an empty expense at once', () => {
    expect(validateTransactionForm({ amount: '', date: '', category: '', description: '' }, EXPENSE)).toEqual({
      amount: 'Enter an amount.',
      date: 'Choose a date.',
      category: 'Choose a category.',
    })
  })

  it('does not ask an income for a category', () => {
    expect(validateTransactionForm({ ...VALID, category: '' }, INCOME)).toEqual({})
  })
})

describe('validateField', () => {
  it.each([
    ['2026-02-30', 'Enter a real date, from 1900 onwards.'],
    ['1899-12-31', 'Enter a real date, from 1900 onwards.'],
    ['2026-10-05', null],
  ])('checks the date %s', (date, message) => {
    expect(validateField('date', { ...VALID, date }, EXPENSE)).toBe(message)
  })

  it('rejects a category that is not in the list', () => {
    expect(validateField('category', { ...VALID, category: 'Groceries' }, EXPENSE)).toBe(
      'Choose one of the listed categories.'
    )
  })

  it('limits the description to 255 characters, ignoring surrounding spaces', () => {
    expect(validateField('description', { ...VALID, description: ` ${'x'.repeat(255)} ` }, EXPENSE)).toBeNull()
    expect(validateField('description', { ...VALID, description: 'x'.repeat(256) }, EXPENSE)).toBe(
      'Keep the description to 255 characters or fewer.'
    )
  })
})

describe('toTransactionPayload', () => {
  it('converts the amount to cents and trims the description', () => {
    expect(toTransactionPayload({ ...VALID, description: '  Lunch  ' }, 'expense', EXPENSE.fields)).toEqual({
      amount_cents: 1250,
      date: '2026-10-05',
      type: 'expense',
      category: 'Food',
      description: 'Lunch',
    })
  })

  it('never sends a field the form does not show, or a blank description', () => {
    expect(toTransactionPayload({ ...VALID, description: '   ' }, 'income', INCOME.fields)).toEqual({
      amount_cents: 1250,
      date: '2026-10-05',
      type: 'income',
    })
  })
})

describe('mapApiErrors', () => {
  it('puts API errors on the matching fields with the field names people see', () => {
    expect(
      mapApiErrors(
        { amount_cents: 'amount_cents must be greater than zero.', type: 'type must be one of: income, expense.' },
        EXPENSE.fields
      )
    ).toEqual({
      fieldErrors: { amount: 'Amount must be greater than zero.' },
      otherErrors: ['type must be one of: income, expense.'],
    })
  })
})
