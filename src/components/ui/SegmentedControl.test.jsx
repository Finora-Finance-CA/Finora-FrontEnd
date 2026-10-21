import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SegmentedControl from './SegmentedControl'

const OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

describe('SegmentedControl', () => {
  it('is a radio group named by its legend, with the chosen option checked', () => {
    render(<SegmentedControl name="type" legend="Transaction type" value="expense" options={OPTIONS} onChange={() => {}} />)

    expect(screen.getByRole('group', { name: 'Transaction type' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Expense' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Income' })).not.toBeChecked()
  })

  it('reports the option chosen', () => {
    const onChange = vi.fn()
    render(<SegmentedControl name="type" legend="Transaction type" value="expense" options={OPTIONS} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Income' }))

    expect(onChange).toHaveBeenCalledWith('income')
  })

  it('can be disabled as a whole', () => {
    render(
      <SegmentedControl name="type" legend="Transaction type" value="expense" options={OPTIONS} onChange={() => {}} disabled />
    )

    expect(screen.getByRole('radio', { name: 'Income' })).toBeDisabled()
  })
})
