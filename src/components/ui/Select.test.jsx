import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Select from './Select'

describe('Select', () => {
  it('is a native select with its options and a decorative chevron', () => {
    const onChange = vi.fn()
    render(
      <Select aria-label="Category" value="" onChange={onChange}>
        <option value="">Choose a category</option>
        <option value="Food">Food</option>
      </Select>
    )

    const select = screen.getByRole('combobox', { name: 'Category' })
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a category', 'Food'])
    expect(select.parentElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    fireEvent.change(select, { target: { value: 'Food' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
