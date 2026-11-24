// How each budget status is shown (US-39, US-40). The API decides the status; these
// check only the tone and label each one gets.

import { describe, expect, it } from 'vitest'
import { budgetAlert, budgetsNeedingAttention, remainingText } from './budgetAlerts'

describe('budgetAlert', () => {
  it.each([
    ['under', 'default', 'On track'],
    ['warning', 'warning', 'Close to limit'],
    ['over', 'danger', 'Over budget'],
  ])('shows %s with the %s tone and label %j', (status, tone, label) => {
    expect(budgetAlert(status)).toEqual({ tone, label })
  })

  it('says how far over the limit an over budget is', () => {
    expect(budgetAlert('over', -2315)).toEqual({ tone: 'danger', label: 'Over by $23.15' })
    expect(budgetAlert('over', -1)).toEqual({ tone: 'danger', label: 'Over by $0.01' })
  })

  it('keeps the under and close-to-limit words whatever is left', () => {
    expect(budgetAlert('under', 8000).label).toBe('On track')
    expect(budgetAlert('warning', 0).label).toBe('Close to limit')
  })

  it.each([undefined, null, '', 'unknown'])('shows %j like under, with no label', (status) => {
    expect(budgetAlert(status)).toEqual({ tone: 'default', label: null })
  })
})
describe('remainingText', () => {
  it('says what is left, or how far over the limit it is', () => {
    expect(remainingText(9513)).toBe('$95.13 left')
    expect(remainingText(0)).toBe('$0.00 left')
    expect(remainingText(-2315)).toBe('Over by $23.15')
  })
})

describe('budgetsNeedingAttention (US-41)', () => {
  const status = (category, limit_cents, spent_cents, state) => ({ category, limit_cents, spent_cents, status: state })

  it('keeps only warning and over budgets, the fullest first', () => {
    const budgets = [
      status('Food', 50000, 40487, 'warning'),
      status('Transportation', 15000, 17315, 'over'),
      status('Housing', 180000, 180000, 'warning'),
      status('Entertainment', 10000, 2000, 'under'),
    ]
    expect(budgetsNeedingAttention(budgets).map(({ category }) => category)).toEqual([
      'Transportation',
      'Housing',
      'Food',
    ])
  })

  it('puts over by a cent above exactly full, though both round to 100%', () => {
    const budgets = [status('Food', 10000, 10000, 'warning'), status('Other', 10000, 10001, 'over')]
    expect(budgetsNeedingAttention(budgets).map(({ category }) => category)).toEqual(['Other', 'Food'])
  })

  it('orders budgets whose ratios differ by less than a floating-point step', () => {
    // 2147483647 / 2147483646 and 2147483648 / 2147483647 are the same double, so dividing
    // called them equal and kept Food first. Food is over by 1 cent in 2147483647, Other by
    // 1 cent in 2147483646, so Other is fuller.
    const budgets = [
      status('Food', 2147483647, 2147483648, 'over'),
      status('Other', 2147483646, 2147483647, 'over'),
    ]
    expect(2147483648 / 2147483647).toBe(2147483647 / 2147483646)
    expect(budgetsNeedingAttention(budgets).map(({ category }) => category)).toEqual(['Other', 'Food'])
  })

  it('does not change the list it is given', () => {
    const budgets = [status('Food', 100, 90, 'warning'), status('Other', 100, 120, 'over')]
    budgetsNeedingAttention(budgets)
    expect(budgets.map(({ category }) => category)).toEqual(['Food', 'Other'])
  })
})
