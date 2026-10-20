// Limits and choices shared by the transaction forms. They mirror the API's
// validation (Finora-API src/transactions/validation.js); keep the two in sync.

export const CATEGORIES = Object.freeze(['Food', 'Transportation', 'Housing', 'Entertainment', 'Other'])

// The colour of each category's label, for light and dark mode. The label always shows
// the category's name too, so colour is never the only signal. Every text/background
// pair is at least 4.5:1 (WCAG AA); constants.test.js checks this. Purple and green are
// left out on purpose: purple is the app's accent and green means income.
export const CATEGORY_COLORS = Object.freeze({
  Food: Object.freeze({
    light: Object.freeze({ text: '#9a3412', background: '#ffedd5' }),
    dark: Object.freeze({ text: '#fdba74', background: '#3a2213' }),
  }),
  Transportation: Object.freeze({
    light: Object.freeze({ text: '#1e40af', background: '#dbeafe' }),
    dark: Object.freeze({ text: '#93c5fd', background: '#172447' }),
  }),
  Housing: Object.freeze({
    light: Object.freeze({ text: '#115e59', background: '#ccfbf1' }),
    dark: Object.freeze({ text: '#5eead4', background: '#122f2c' }),
  }),
  Entertainment: Object.freeze({
    light: Object.freeze({ text: '#9d174d', background: '#fce7f3' }),
    dark: Object.freeze({ text: '#f9a8d4', background: '#3b1228' }),
  }),
  Other: Object.freeze({
    light: Object.freeze({ text: '#374151', background: '#eceef2' }),
    dark: Object.freeze({ text: '#d1d5db', background: '#2a2c35' }),
  }),
})

// Largest value the API's amount_cents column can hold ($21,474,836.47).
export const MAX_AMOUNT_CENTS = 2_147_483_647

export const MAX_DESCRIPTION_LENGTH = 255

export const MIN_DATE = '1900-01-01'

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
