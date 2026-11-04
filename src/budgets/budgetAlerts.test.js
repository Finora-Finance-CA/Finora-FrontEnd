// How each budget status is shown (US-39, US-40). The API decides the status; these
// check only the tone and label each one gets.

import { describe, expect, it } from 'vitest'
import { budgetAlert } from './budgetAlerts'

describe('budgetAlert', () => {
  it.each([
    ['under', 'default', null],
    ['warning', 'warning', 'Close to limit'],
    ['over', 'danger', 'Over budget'],
  ])('shows %s with the %s tone and label %j', (status, tone, label) => {
    expect(budgetAlert(status)).toEqual({ tone, label })
  })

  it.each([undefined, null, '', 'unknown'])('shows %j like under, with no label', (status) => {
    expect(budgetAlert(status)).toEqual({ tone: 'default', label: null })
  })
})