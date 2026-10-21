import { afterEach, describe, expect, it, vi } from 'vitest'
import { describeRange, matchPreset, presetRange } from './datePresets'

describe('presetRange', () => {
  it.each([
    ['this-month', '2026-10-20', { from: '2026-10-01', to: '2026-10-31' }],
    ['last-month', '2026-10-20', { from: '2026-09-01', to: '2026-09-30' }],
    ['last-90-days', '2026-10-20', { from: '2026-07-23', to: '2026-10-20' }],
    ['all', '2026-10-20', { from: '', to: '' }],
  ])('%s on %s', (id, today, range) => {
    expect(presetRange(id, today)).toEqual(range)
  })

  it('crosses year ends', () => {
    expect(presetRange('last-month', '2027-01-15')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(presetRange('this-month', '2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(presetRange('last-90-days', '2027-01-15')).toEqual({ from: '2026-10-18', to: '2027-01-15' })
  })

  it('knows the length of February, in leap years too', () => {
    expect(presetRange('this-month', '2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(presetRange('last-month', '2027-03-31')).toEqual({ from: '2027-02-01', to: '2027-02-28' })
  })

  describe('without a date given', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('uses the local date, even late in the evening', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 9, 31, 23, 30))

      expect(presetRange('this-month')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    })
  })
})

describe('matchPreset', () => {
  const TODAY = '2026-10-20'

  it.each([
    [{ from: '', to: '' }, 'all'],
    [{ from: '2026-10-01', to: '2026-10-31' }, 'this-month'],
    [{ from: '2026-09-01', to: '2026-09-30' }, 'last-month'],
    [{ from: '2026-07-23', to: '2026-10-20' }, 'last-90-days'],
    [{ from: '2026-10-01', to: '' }, 'custom'],
    [{ from: '', to: '2026-10-31' }, 'custom'],
    [{ from: '2026-09-01', to: '2026-09-29' }, 'custom'],
  ])('%j is %s', (range, id) => {
    expect(matchPreset(range, TODAY)).toBe(id)
  })
})

describe('describeRange', () => {
  const TODAY = '2026-10-20'

  it.each([
    [{ from: '', to: '' }, 'All time'],
    [{ from: '2026-09-01', to: '2026-09-30' }, 'Last month'],
    [{ from: '2026-09-05', to: '2026-09-12' }, 'Sep 5, 2026 to Sep 12, 2026'],
    [{ from: '2026-09-05', to: '' }, 'From Sep 5, 2026'],
    [{ from: '', to: '2026-09-12' }, 'Until Sep 12, 2026'],
  ])('%j reads as %s', (range, label) => {
    expect(describeRange(range, TODAY)).toBe(label)
  })
})
