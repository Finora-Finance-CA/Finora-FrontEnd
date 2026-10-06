// Limits and choices shared by the transaction forms. They mirror the API's
// validation (Finora-API src/transactions/validation.js); keep the two in sync.

export const CATEGORIES = Object.freeze(['Food', 'Transportation', 'Housing', 'Entertainment', 'Other'])

// Largest value the API's amount_cents column can hold ($21,474,836.47).
export const MAX_AMOUNT_CENTS = 2_147_483_647

export const MAX_DESCRIPTION_LENGTH = 255

export const MIN_DATE = '1900-01-01'
