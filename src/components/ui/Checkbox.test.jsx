import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Checkbox from './Checkbox'

describe('Checkbox', () => {
  it('is a real checkbox named by its label', () => {
    const onChange = vi.fn()
    render(<Checkbox label="Food" checked={false} onChange={onChange} />)

    const checkbox = screen.getByRole('checkbox', { name: 'Food' })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
