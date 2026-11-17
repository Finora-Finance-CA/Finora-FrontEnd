// Validation for the transaction forms (add and edit, expense and income), built from the
// shared rules in ../validation/rules.js so it matches the API exactly.
// Form values are the raw strings from the inputs:
//   { amount: '19.99', date: '2026-10-06', category: 'Food', description: '' }

import { mapApiFieldErrors } from '../validation/apiErrors'
import { validateCategory, validateDate, validateText } from '../validation/rules'
import { MAX_DESCRIPTION_LENGTH } from './constants'
import { parseDollarsToCents } from './money'

export const FIELD_NAMES = Object.freeze(['amount', 'date', 'category', 'description'])

const validators = {
  amount: (values) => parseDollarsToCents(values.amount, 'Amount').error,
  date: (values) => validateDate(values.date, 'Date'),
  category: (values, { categoryRequired }) => validateCategory(values.category, { required: categoryRequired }),
  description: (values) => validateText(values.description, 'Description', { max: MAX_DESCRIPTION_LENGTH }),
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
 * Checks every field the form shows. Returns { field: message } for each invalid
 * one; an empty object means the form is valid.
 *
 * @param {object} values
 * @param {{ categoryRequired: boolean, fields?: readonly string[] }} options
 *   `fields` defaults to all of FIELD_NAMES.
 */
export function validateTransactionForm(values, options) {
  const { fields = FIELD_NAMES } = options
  const errors = {}
  for (const field of fields) {
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
 * @param {readonly string[]} [fields] The fields the form shows. A value for a
 *   field that isn't shown (e.g. category on the income form) is never sent.
 */
export function toTransactionPayload(values, type, fields = FIELD_NAMES) {
  const payload = {
    amount_cents: parseDollarsToCents(values.amount).cents,
    date: values.date,
    type,
  }
  if (fields.includes('category') && values.category) payload.category = values.category

  const description = values.description.trim()
  if (description) payload.description = description

  return payload
}

// API field names to the form's.
const API_TO_FORM_FIELD = { amount_cents: 'amount', date: 'date', category: 'category', description: 'description' }

/**
 * Puts the API's 400 `errors` under the form fields they belong to (see
 * mapApiFieldErrors). Errors for fields the form doesn't show (e.g. `type` or `body`)
 * only set `hasOtherErrors`; their text is never shown.
 *
 * @param {Record<string, string>} apiErrors
 * @param {readonly string[]} [fields] The fields the form shows.
 * @returns {{ fieldErrors: Record<string, string>, hasOtherErrors: boolean }}
 */
export function mapApiErrors(apiErrors, fields = FIELD_NAMES) {
  const shown = Object.fromEntries(Object.entries(API_TO_FORM_FIELD).filter(([, field]) => fields.includes(field)))
  return mapApiFieldErrors(apiErrors, shown)
}
