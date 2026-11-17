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
      amount: 'Amount is required.',
      date: 'Date is required.',
      category: 'Category is required for an expense.',
    })
  })

  it('does not ask an income for a category', () => {
    expect(validateTransactionForm({ ...VALID, category: '' }, INCOME)).toEqual({})
  })
})

describe('validateField', () => {
  it.each([
    ['2026-02-30', 'Date must be a real calendar date.'],
    ['2025-02-29', 'Date must be a real calendar date.'],
    ['1899-12-31', 'Date must be between 1900-01-01 and 2100-12-31.'],
    ['2101-01-01', 'Date must be between 1900-01-01 and 2100-12-31.'],
    ['2026/10/05', 'Date must be in YYYY-MM-DD format, for example 2026-10-05.'],
    ['', 'Date is required.'],
    ['2024-02-29', null],
    ['2026-10-05', null],
  ])('checks the date %s', (date, message) => {
    expect(validateField('date', { ...VALID, date }, EXPENSE)).toBe(message)
  })

  it('rejects a category that is not in the list', () => {
    expect(validateField('category', { ...VALID, category: 'Groceries' }, EXPENSE)).toBe(
      'Category must be one of Food, Transportation, Housing, Entertainment or Other.'
    )
  })

  it('counts the description in characters as the API does, so 255 emoji fit', () => {
    expect(validateField('description', { ...VALID, description: '😀'.repeat(255) }, EXPENSE)).toBeNull()
    expect(validateField('description', { ...VALID, description: '😀'.repeat(256) }, EXPENSE)).toBe(
      'Description must be 255 characters or fewer.'
    )
  })

  it('limits the description to 255 characters, ignoring surrounding spaces', () => {
    expect(validateField('description', { ...VALID, description: ` ${'x'.repeat(255)} ` }, EXPENSE)).toBeNull()
    expect(validateField('description', { ...VALID, description: 'x'.repeat(256) }, EXPENSE)).toBe(
      'Description must be 255 characters or fewer.'
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
  it('puts the API’s plain-language messages under the matching fields', () => {
    expect(
      mapApiErrors({ amount_cents: 'Amount must be greater than 0.', date: 'Date must be a real calendar date.' }, EXPENSE.fields)
    ).toEqual({
      fieldErrors: { amount: 'Amount must be greater than 0.', date: 'Date must be a real calendar date.' },
      hasOtherErrors: false,
    })
  })

  it('never shows the text of an error for a field the form does not have', () => {
    expect(mapApiErrors({ type: 'Type must be income or expense.' }, EXPENSE.fields)).toEqual({
      fieldErrors: {},
      hasOtherErrors: true,
    })
  })

  it('drops a category error on the income form, which has no category field', () => {
    expect(mapApiErrors({ category: 'Category must be one of Food.' }, INCOME.fields)).toEqual({
      fieldErrors: {},
      hasOtherErrors: true,
    })
  })

  it.each([
    ['not text', { detail: 'x' }],
    ['empty', '   '],
    ['very long', 'x'.repeat(500)],
  ])('drops a field message that is %s', (_, message) => {
    expect(mapApiErrors({ amount_cents: message }, EXPENSE.fields)).toEqual({ fieldErrors: {}, hasOtherErrors: true })
  })
})
