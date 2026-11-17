import { describe, expect, it } from 'vitest'
import { MAX_AMOUNT_CENTS } from './constants'
import { centsToDollarString, formatCents, parseDollarsToCents, readDollars } from './money'

describe('parseDollarsToCents', () => {
  it.each([
    ['19.99', 1999],
    ['5', 500],
    ['5.', 500],
    ['.75', 75],
    ['0.05', 5],
    ['$12.50', 1250],
    ['  1,250.5 ', 125050],
    ['1250', 125000],
    ['21,474,836.47', MAX_AMOUNT_CENTS],
  ])('reads %j as %i cents', (input, cents) => {
    expect(parseDollarsToCents(input)).toEqual({ cents, error: null })
  })

  it.each([
    ['', 'Amount is required.'],
    ['   ', 'Amount is required.'],
    ['abc', 'Amount must be a number, for example 12.50.'],
    ['.', 'Amount must be a number, for example 12.50.'],
    ['-5', 'Amount must be greater than 0.'],
    ['-$5', 'Amount must be greater than 0.'],
    ['$-5', 'Amount must be greater than 0.'],
    ['-0', 'Amount must be greater than 0.'],
    ['-abc', 'Amount must be a number, for example 12.50.'],
    ['12abc', 'Amount must be a number, for example 12.50.'],
    ['1e3', 'Amount must be a number, for example 12.50.'],
    ['Infinity', 'Amount must be a number, for example 12.50.'],
    ['NaN', 'Amount must be a number, for example 12.50.'],
    ['-1.999', 'Amount can have at most 2 decimal places, for example 12.50.'],
    ['1,25', 'Amount must be a number, for example 12.50.'],
    ['1.999', 'Amount can have at most 2 decimal places, for example 12.50.'],
    ['0', 'Amount must be greater than 0.'],
    ['0.00', 'Amount must be greater than 0.'],
    ['21474836.48', 'Amount must be $21,474,836.47 or less.'],
  ])('rejects %j', (input, error) => {
    expect(parseDollarsToCents(input)).toEqual({ cents: null, error })
  })
})

describe('readDollars', () => {
  it.each([
    ['12.50', { cents: 1250, reason: null }],
    ['', { cents: null, reason: 'empty' }],
    ['-1', { cents: null, reason: 'negative' }],
    ['-0.01', { cents: null, reason: 'negative' }],
    ['abc', { cents: null, reason: 'format' }],
    ['1.005', { cents: null, reason: 'decimals' }],
    ['0', { cents: null, reason: 'zero' }],
    ['21474836.48', { cents: null, reason: 'too_large' }],
  ])('reads %j', (input, expected) => {
    expect(readDollars(input)).toEqual(expected)
  })
})

const AMOUNTS = [
  [0, '0.00', '$0.00'],
  [5, '0.05', '$0.05'],
  [99, '0.99', '$0.99'],
  [100, '1.00', '$1.00'],
  [1999, '19.99', '$19.99'],
  [100000, '1000.00', '$1,000.00'],
  [MAX_AMOUNT_CENTS, '21474836.47', '$21,474,836.47'],
  [Number.MAX_SAFE_INTEGER, '90071992547409.91', '$90,071,992,547,409.91'],
]

describe('centsToDollarString', () => {
  it.each(AMOUNTS)('turns %i cents into %j', (cents, dollars) => {
    expect(centsToDollarString(cents)).toBe(dollars)
  })

  it('keeps the sign of a negative amount', () => {
    expect(centsToDollarString(-1205)).toBe('-12.05')
  })

  it.each([12.5, NaN, Infinity, '1999', null, Number.MAX_SAFE_INTEGER + 1])('rejects %j', (cents) => {
    expect(() => centsToDollarString(cents)).toThrow(TypeError)
  })
})

describe('formatCents', () => {
  it.each(AMOUNTS)('formats %i cents as %j', (cents, _, text) => {
    expect(formatCents(cents)).toBe(text)
  })

  it('shows a negative amount with a minus sign', () => {
    expect(formatCents(-1205)).toBe('-$12.05')
  })
})

describe('round trips', () => {
  it.each(AMOUNTS.filter(([cents]) => cents > 0 && cents <= MAX_AMOUNT_CENTS))(
    '%i cents → %j → the same cents',
    (cents, dollars) => {
      expect(parseDollarsToCents(centsToDollarString(cents)).cents).toBe(cents)
      expect(centsToDollarString(parseDollarsToCents(dollars).cents)).toBe(dollars)
    }
  )

  it('gives the same text back for every cent value from $0.01 to $10.00', () => {
    for (let cents = 1; cents <= 1000; cents += 1) {
      const dollars = centsToDollarString(cents)
      expect(parseDollarsToCents(dollars).cents).toBe(cents)
      expect(centsToDollarString(parseDollarsToCents(dollars).cents)).toBe(dollars)
    }
  })
})
