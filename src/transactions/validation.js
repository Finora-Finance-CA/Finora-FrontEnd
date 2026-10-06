// Validation for the transaction forms (Add Expense now, Add Income in US-12).
// Form values are the raw strings from the inputs:
//   { amount: '19.99', date: '2026-10-06', category: 'Food', description: '' }

import { CATEGORIES, MAX_DESCRIPTION_LENGTH } from './constants'
import { isValidDate } from './dates'
import { parseDollarsToCents } from './money'

export const FIELD_NAMES = Object.freeze(['amount', 'date', 'category', 'description'])

const validators = {
  amount: (values) => parseDollarsToCents(values.amount).error,

  date: (values) => {
    if (!values.date) return 'Choose a date.'
    if (!isValidDate(values.date)) return 'Enter a real date, from 1900 onwards.'
    return null
  },

  category: (values, { categoryRequired }) => {
    if (!values.category) return categoryRequired ? 'Choose a category.' : null
    if (!CATEGORIES.includes(values.category)) return 'Choose one of the listed categories.'
    return null
  },

  description: (values) => {
    if (values.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return `Keep the description to ${MAX_DESCRIPTION_LENGTH} characters or fewer.`
    }
    return null
  },
}

/**
 * Checks one field. Returns an error message, or null if it's fine.
 *
 * @param {'amount'|'date'|'category'|'description'} field
 * @param {object} values All form values (some checks may depend on other fields).
 * @param {{ categoryRequired: boolean }} options
 */
export function validateField(field, values, options) {
  return validators[field](values, options)
}

/**
 * Checks every field. Returns { field: message } for each invalid one; an empty
 * object means the form is valid.
 */
export function validateTransactionForm(values, options) {
  const errors = {}
  for (const field of FIELD_NAMES) {
    const message = validateField(field, values, options)
    if (message) errors[field] = message
  }
  return errors
}

/**
 * Turns valid form values into the body for POST /api/transactions.
 * Call only after validateTransactionForm returns no errors.
 *
 * @param {object} values
 * @param {'income'|'expense'} type
 */
export function toTransactionPayload(values, type) {
  const payload = {
    amount_cents: parseDollarsToCents(values.amount).cents,
    date: values.date,
    type,
  }
  if (values.category) payload.category = values.category

  const description = values.description.trim()
  if (description) payload.description = description

  return payload
}

// API field names that differ from the form's.
const API_TO_FORM_FIELD = { amount_cents: 'amount' }

/**
 * Splits the API's 400 `errors` object into errors for form fields and a list of
 * messages that don't belong to any field (e.g. `type` or `body`).
 *
 * @param {Record<string, string>} apiErrors
 * @returns {{ fieldErrors: Record<string, string>, otherErrors: string[] }}
 */
export function mapApiErrors(apiErrors) {
  const fieldErrors = {}
  const otherErrors = []

  for (const [apiField, message] of Object.entries(apiErrors ?? {})) {
    const field = API_TO_FORM_FIELD[apiField] ?? apiField
    if (FIELD_NAMES.includes(field)) {
      fieldErrors[field] = humanizeApiMessage(apiField, field, message)
    } else {
      otherErrors.push(String(message))
    }
  }
  return { fieldErrors, otherErrors }
}

// The API's messages start with its field name ("amount_cents must be ..."). Swap
// that for the label the user sees ("Amount must be ...").
function humanizeApiMessage(apiField, field, message) {
  const text = String(message)
  if (!text.startsWith(apiField)) return text
  const label = field.charAt(0).toUpperCase() + field.slice(1)
  return label + text.slice(apiField.length)
}
