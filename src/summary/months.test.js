import { describe, expect, it } from 'vitest'
import { addMonths, currentMonth, formatMonth, isValidMonth } from './months'

describe('currentMonth', () => {
  it('uses the local calendar, even late on the last evening of a month', () => {
    expect(currentMonth(new Date(2026, 9, 31, 23, 30))).toBe('2026-10')
    expect(currentMonth(new Date(2026, 11, 31, 23, 59))).toBe('2026-12')
    expect(currentMonth(new Date(2027, 0, 1, 0, 1))).toBe('2027-01')
  })
})

describe('isValidMonth', () => {
  it.each(['2026-10', '1900-01', '2026-12', '9999-12'])('accepts %s', (value) => {
    expect(isValidMonth(value)).toBe(true)
  })

  it.each(['2026-13', '2026-00', '2026-1', '1899-12', '2026-10-01', 'abc', '', null, undefined])('rejects %j', (value) => {
    expect(isValidMonth(value)).toBe(false)
  })
})

describe('addMonths', () => {
  it.each([
    ['2026-10', 1, '2026-11'],
    ['2026-10', -1, '2026-09'],
    ['2026-12', 1, '2027-01'],
    ['2027-01', -1, '2026-12'],
    ['2026-10', 12, '2027-10'],
    ['2026-10', -22, '2024-12'],
    ['1900-02', -1, '1900-01'],
  ])('%s plus %i months is %s', (value, count, expected) => {
    expect(addMonths(value, count)).toBe(expected)
  })
})

describe('formatMonth', () => {
  it.each([
    ['2026-10', 'October 2026'],
    ['2027-01', 'January 2027'],
    ['1900-01', 'January 1900'],
  ])('shows %s as %s', (value, label) => {
    expect(formatMonth(value)).toBe(label)
  })
})
