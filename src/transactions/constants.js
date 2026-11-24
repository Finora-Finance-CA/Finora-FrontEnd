// Limits and choices shared by the transaction forms. They mirror the API's
// validation (Finora-API src/transactions/validation.js); keep the two in sync.

export const CATEGORIES = Object.freeze(['Food', 'Transportation', 'Housing', 'Entertainment', 'Other'])

// The categories a monthly budget can be set for (the API's BUDGET_CATEGORIES).
// Budgets limit spending, and every category can be used on an expense.
export const BUDGET_CATEGORIES = CATEGORIES

// Largest value the API's amount_cents column can hold ($21,474,836.47).
export const MAX_AMOUNT_CENTS = 2_147_483_647

export const MAX_DESCRIPTION_LENGTH = 255

// The range of dates the API accepts, inclusive (validation-rules.md).
export const MIN_DATE = '1900-01-01'
export const MAX_DATE = '2100-12-31'

// How many transactions GET /api/transactions returns per page (the API's
// TRANSACTION_PAGE_SIZE). The API also sends it back as pagination.page_size.
export const TRANSACTION_PAGE_SIZE = 20

// The API's limit on the search text (q).
export const MAX_SEARCH_LENGTH = 255

// How long the search box waits after the last keystroke before searching.
export const SEARCH_DEBOUNCE_MS = 300

// What differs between an expense and an income. `fields` lists the inputs the form
// shows, validates and sends, in on-screen order. A category is required for an
// expense; income has no category.
export const TRANSACTION_TYPES = Object.freeze({
  expense: Object.freeze({
    label: 'Expense',
    title: 'Add expense',
    editTitle: 'Edit expense',
    submitLabel: 'Save expense',
    fields: Object.freeze(['amount', 'date', 'category', 'description']),
  }),
  income: Object.freeze({
    label: 'Income',
    title: 'Add income',
    editTitle: 'Edit income',
    submitLabel: 'Save income',
    fields: Object.freeze(['amount', 'date', 'description']),
  }),
})
