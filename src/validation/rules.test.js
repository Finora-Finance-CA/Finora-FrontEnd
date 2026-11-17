// The shared front-end rules (US-52, US-58): the same limits and messages as the API
// (validation-rules.md), so a problem reads the same wherever it's found.

import { describe, expect, it } from 'vitest'
import { parseDollarsToCents } from '../transactions/money'
import {
  MAX_DATE,
  MESSAGES,
  MIN_DATE,
  characterCount,
  choiceList,
  validateCategory,
  validateChoice,
  validateDate,
  validateEmail,
  validatePassword,
  validateText,
} from './rules'

describe('money typed in dollars (parseDollarsToCents)', () => {
  it.each([
    ['1 cent', '0.01', 1],
    ['the largest amount', '21474836.47', 2_147_483_647],
    ['a whole number', '12', 1200],
    ['with a dollar sign and commas', '$1,250.50', 125050],
  ])('accepts %s', (_, input, cents) => {
    expect(parseDollarsToCents(input, 'Target')).toEqual({ cents, error: null })
  })

  it.each([
    ['empty', '', 'Target is required.'],
    ['zero', '0', 'Target must be greater than 0.'],
    ['negative', '-5', 'Target must be greater than 0.'],
    ['non-numeric', 'twelve', 'Target must be a number, for example 12.50.'],
    ['digits then letters', '12abc', 'Target must be a number, for example 12.50.'],
    ['an exponent', '1e3', 'Target must be a number, for example 12.50.'],
    ['too many decimals', '12.345', 'Target can have at most 2 decimal places, for example 12.50.'],
    ['over the maximum', '21474836.48', 'Target must be $21,474,836.47 or less.'],
  ])('rejects %s with the label it is given', (_, input, error) => {
    expect(parseDollarsToCents(input, 'Target')).toEqual({ cents: null, error })
  })
})

describe('validateDate', () => {
  it.each([MIN_DATE, MAX_DATE, '2024-02-29', '2000-02-29', '2026-10-05'])('accepts %s', (value) => {
    expect(validateDate(value, 'Date')).toBeNull()
  })

  it.each([
    ['', 'Date is required.'],
    ['2026/10/05', 'Date must be in YYYY-MM-DD format, for example 2026-10-05.'],
    ['2026-1-5', 'Date must be in YYYY-MM-DD format, for example 2026-10-05.'],
    ['2025-02-29', 'Date must be a real calendar date.'],
    ['2100-02-29', 'Date must be a real calendar date.'],
    ['2026-04-31', 'Date must be a real calendar date.'],
    ['2026-13-01', 'Date must be a real calendar date.'],
    ['1899-12-31', 'Date must be between 1900-01-01 and 2100-12-31.'],
    ['2101-01-01', 'Date must be between 1900-01-01 and 2100-12-31.'],
    ['0050-06-15', 'Date must be between 1900-01-01 and 2100-12-31.'],
  ])('rejects %j', (value, message) => {
    expect(validateDate(value, 'Date')).toBe(message)
  })

  it('lets an optional date be empty, but still checks one that is given', () => {
    expect(validateDate('', 'Target date', { required: false })).toBeNull()
    expect(validateDate('2025-02-29', 'Target date', { required: false })).toBe('Target date must be a real calendar date.')
  })
})

describe('choices and categories', () => {
  it('words the choices the way the API does', () => {
    expect(choiceList(['income', 'expense'])).toBe('income or expense')
    expect(validateChoice('refund', 'Type', ['income', 'expense'])).toBe('Type must be income or expense.')
    expect(validateCategory('Groceries', { required: true })).toBe(
      'Category must be one of Food, Transportation, Housing, Entertainment or Other.'
    )
  })

  it('requires a category only for an expense', () => {
    expect(validateCategory('', { required: true })).toBe('Category is required for an expense.')
    expect(validateCategory('', { required: false })).toBeNull()
    expect(validateCategory('Food', { required: true })).toBeNull()
  })
})

describe('validateText', () => {
  it('trims, and counts characters as the API does', () => {
    expect(validateText(`  ${'a'.repeat(60)}  `, 'Name', { required: true, max: 60 })).toBeNull()
    expect(validateText('😀'.repeat(60), 'Name', { required: true, max: 60 })).toBeNull()
    expect(validateText('a'.repeat(61), 'Name', { required: true, max: 60 })).toBe('Name must be 60 characters or fewer.')
    expect(characterCount('a😀')).toBe(2)
  })

  it('treats blank as missing only when the text is required', () => {
    expect(validateText('   ', 'Name', { required: true, max: 60 })).toBe('Name is required.')
    expect(validateText('   ', 'Description', { max: 255 })).toBeNull()
  })
})

describe('email and password', () => {
  it.each([
    ['', 'Email is required.'],
    ['   ', 'Email is required.'],
    ['name', MESSAGES.email],
    ['name@example', MESSAGES.email],
    ['name @example.com', MESSAGES.email],
    [' name@example.com ', null],
  ])('checks the email %j', (value, message) => {
    expect(validateEmail(value)).toBe(message)
  })

  it('requires a password, with a minimum length only when asked for one', () => {
    expect(validatePassword('')).toBe('Password is required.')
    expect(validatePassword('short')).toBeNull()
    expect(validatePassword('short', { minLength: 8 })).toBe('Password must be at least 8 characters.')
    expect(validatePassword('12345678', { minLength: 8 })).toBeNull()
  })
})
