// Limits and choices shared by the transaction forms. They mirror the API's
// validation (Finora-API src/transactions/validation.js); keep the two in sync.

export const CATEGORIES = Object.freeze(['Food', 'Transportation', 'Housing', 'Entertainment', 'Other'])

// Largest value the API's amount_cents column can hold ($21,474,836.47).
export const MAX_AMOUNT_CENTS = 2_147_483_647

export const MAX_DESCRIPTION_LENGTH = 255

export const MIN_DATE = '1900-01-01'

// What differs between adding an expense and adding an income. `fields` lists the
// inputs the form shows, validates and sends, in on-screen order. A category is
// required for an expense; income has no category.
export const TRANSACTION_TYPES = Object.freeze({
  expense: Object.freeze({
    label: 'Expense',
    title: 'Add expense',
    submitLabel: 'Save expense',
    fields: Object.freeze(['amount', 'date', 'category', 'description']),
  }),
  income: Object.freeze({
    label: 'Income',
    title: 'Add income',
    submitLabel: 'Save income',
    fields: Object.freeze(['amount', 'date', 'description']),
  }),
})
