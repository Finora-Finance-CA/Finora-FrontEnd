import { describe, expect, it } from 'vitest'
import { MAX_AMOUNT_CENTS } from '../transactions/constants'
import { LIMIT_REQUIRED, parseLimitToCents } from './limits'

describe('parseLimitToCents', () => {
  it.each([
    ['1', 100],
    ['1.5', 150],
    ['1.05', 105],
    ['0.01', 1],
    ['1,000.00', 100000],
    ['$12', 1200],
    ['  500  ', 50000],
    [' $1,250.50 ', 125050],
    ['.99', 99],
    ['21474836.47', MAX_AMOUNT_CENTS],
  ])('reads %j as %i cents', (input, cents) => {
    expect(parseLimitToCents(input)).toEqual({ cents, error: null })
  })

  it.each(['', '   ', '0', '0.00', '-1', '-0.01', 'abc', '$', '1,00', '12abc', null, undefined])(
    'rejects %j with the plain message',
    (input) => {
      expect(parseLimitToCents(input)).toEqual({ cents: null, error: LIMIT_REQUIRED })
    }
  )

  it('explains a limit with more than two decimal places', () => {
    expect(parseLimitToCents('1.005')).toEqual({ cents: null, error: 'Use at most two decimal places, like 500.00.' })
  })

  it('explains a limit larger than the API can store', () => {
    expect(parseLimitToCents('21474836.48')).toEqual({ cents: null, error: 'Enter a limit no more than $21,474,836.47.' })
  })

  it('never goes through floating point dollars', () => {
    // 19.99 * 100 is 1998.9999999999998 in floating point.
    expect(parseLimitToCents('19.99').cents).toBe(1999)
    expect(parseLimitToCents('0.29').cents).toBe(29)
  })

  it('gets every cent from $0.01 to $10.00 exactly', () => {
    for (let cents = 1; cents <= 1000; cents += 1) {
      const dollars = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
      expect(parseLimitToCents(dollars).cents).toBe(cents)
    }
  })
})
