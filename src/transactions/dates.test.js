import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidDate, todayLocal } from './dates'

describe('todayLocal', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the local calendar date, even late in the evening', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 6, 23, 30))

    expect(todayLocal()).toBe('2026-10-06')
  })
})

describe('isValidDate', () => {
  it.each(['2026-10-06', '2024-02-29', '1900-01-01'])('accepts %s', (value) => {
    expect(isValidDate(value)).toBe(true)
  })

  it.each(['2025-02-29', '2026-13-01', '1899-12-31', '06/10/2026', '', undefined])('rejects %s', (value) => {
    expect(isValidDate(value)).toBe(false)
  })
})
