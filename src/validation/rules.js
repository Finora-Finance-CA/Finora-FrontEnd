// The checks every form uses, and the exact message each one shows (US-52, US-58). They
// mirror the API's rules (Finora-API src/validation/rules.js, listed in
// validation-rules.md), with the same labels and wording, so a problem reads the same
// whether the browser or the API finds it. Pure functions; no React.
//
// Money is typed in dollars here and turned into integer cents with string maths only
// (readDollars in ../transactions/money.js), never floating point.

import { CATEGORIES, MAX_AMOUNT_CENTS, MAX_DATE, MIN_DATE } from '../transactions/constants'

export { MAX_AMOUNT_CENTS, MAX_DATE, MIN_DATE }
export const MIN_PASSWORD_LENGTH = 8

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** "income or expense", "Food, Transportation, Housing, Entertainment or Other". */
export function choiceList(choices) {
  return choices.length < 2 ? choices.join('') : `${choices.slice(0, -1).join(', ')} or ${choices.at(-1)}`
}

export const MESSAGES = Object.freeze({
  required: (label) => `${label} is required.`,
  // Money typed in dollars.
  amountFormat: (label) => `${label} must be a number, for example 12.50.`,
  decimals: (label) => `${label} can have at most 2 decimal places, for example 12.50.`,
  positive: (label) => `${label} must be greater than 0.`,
  maxAmount: (label) => `${label} must be $21,474,836.47 or less.`,
  // The same date messages as the API.
  dateFormat: (label) => `${label} must be in YYYY-MM-DD format, for example 2026-10-05.`,
  realDate: (label) => `${label} must be a real calendar date.`,
  dateRange: (label) => `${label} must be between ${MIN_DATE} and ${MAX_DATE}.`,
  choice: (label, choices) => `${label} must be ${choices.length === 2 ? '' : 'one of '}${choiceList(choices)}.`,
  maxLength: (label, max) => `${label} must be ${max} characters or fewer.`,
  minLength: (label, min) => `${label} must be at least ${min} characters.`,
  email: 'Email must be a valid email address, for example name@example.com.',
  categoryForExpense: 'Category is required for an expense.',
})

/** Characters as Postgres (and the API) count them: an emoji is one. */
export function characterCount(text) {
  return [...text].length
}

/**
 * A YYYY-MM-DD date: exactly that format, a real calendar day (no Feb 30, no Feb 29
 * outside a leap year), from MIN_DATE to MAX_DATE.
 *
 * @param {string} value
 * @param {string} label How the message names the field, e.g. "Date".
 * @param {{ required?: boolean }} [options] Not required: empty is fine.
 * @returns {string|null} An error message, or null if it's valid.
 */
export function validateDate(value, label, { required = true } = {}) {
  if (!value) return required ? MESSAGES.required(label) : null
  const match = DATE_PATTERN.exec(value)
  if (!match) return MESSAGES.dateFormat(label)

  const [year, month, day] = match.slice(1).map(Number)
  // Date.UTC rolls invalid days over (Feb 30 becomes Mar 2), so compare the parts back.
  // Date.UTC reads years 0 to 99 as 1900 to 1999, so set the year separately.
  const parsed = new Date(Date.UTC(2000, month - 1, day))
  parsed.setUTCFullYear(year)
  const isReal =
    month >= 1 &&
    month <= 12 &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  if (!isReal) return MESSAGES.realDate(label)
  // Same-format YYYY-MM-DD strings compare correctly as text.
  if (value < MIN_DATE || value > MAX_DATE) return MESSAGES.dateRange(label)
  return null
}

/**
 * One of a fixed list, matched exactly.
 *
 * @param {string} value
 * @param {string} label
 * @param {readonly string[]} choices
 * @param {{ required?: boolean }} [options]
 * @returns {string|null}
 */
export function validateChoice(value, label, choices, { required = true } = {}) {
  if (!value) return required ? MESSAGES.required(label) : null
  return choices.includes(value) ? null : MESSAGES.choice(label, choices)
}

/** An expense's category: required, and one of the categories. */
export function validateCategory(value, { required }) {
  if (!value) return required ? MESSAGES.categoryForExpense : null
  return validateChoice(value, 'Category', CATEGORIES)
}

/**
 * Text that is trimmed before it's checked and sent.
 *
 * @param {string} value
 * @param {string} label
 * @param {{ required?: boolean, max: number }} options Required: blank counts as missing.
 * @returns {string|null}
 */
export function validateText(value, label, { required = false, max }) {
  const text = (value ?? '').trim()
  if (text === '') return required ? MESSAGES.required(label) : null
  return characterCount(text) > max ? MESSAGES.maxLength(label, max) : null
}

/** An email address, trimmed. */
export function validateEmail(value) {
  const text = (value ?? '').trim()
  if (text === '') return MESSAGES.required('Email')
  return EMAIL_PATTERN.test(text) ? null : MESSAGES.email
}

/**
 * A password, never trimmed.
 *
 * @param {string} value
 * @param {{ minLength?: number }} [options] Only a new password (registering) has a minimum.
 */
export function validatePassword(value, { minLength = 0 } = {}) {
  if (!value) return MESSAGES.required('Password')
  return value.length < minLength ? MESSAGES.minLength('Password', minLength) : null
}
