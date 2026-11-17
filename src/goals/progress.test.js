import { describe, expect, it } from 'vitest'
import { goalPercent, isGoalReached } from './progress'

describe('goalPercent', () => {
  it('gets $14.50 of $50.00 right: 29%, where floating point says 28%', () => {
    expect(Math.floor((1450 / 5000) * 100)).toBe(28)
    expect(goalPercent(1450, 5000)).toBe(29)
  })

  it.each([
    ['nothing saved', 0, 5000, 0],
    ['29 cents of $1.00', 29, 100, 29],
    ['57 cents of $1.00', 57, 100, 57],
    ['one cent short of the target, rounded down', 4999, 5000, 99],
    ['exactly the target', 5000, 5000, 100],
    ['past the target, capped at 100', 7500, 5000, 100],
    ['a third, rounded down', 1, 3, 33],
    ['the largest totals, still exact', Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER, 99],
  ])('%s is %i%%', (_, saved, target, percent) => {
    expect(goalPercent(saved, target)).toBe(percent)
  })

  it('treats a missing or zero target as 0%, rather than dividing by zero', () => {
    expect(goalPercent(100, 0)).toBe(0)
    expect(goalPercent(100, undefined)).toBe(0)
  })
})

describe('isGoalReached', () => {
  it('is true from the target up', () => {
    expect(isGoalReached(4999, 5000)).toBe(false)
    expect(isGoalReached(5000, 5000)).toBe(true)
    expect(isGoalReached(5001, 5000)).toBe(true)
  })
})
