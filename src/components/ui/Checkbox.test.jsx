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

  it('shows a colour swatch that screen readers skip', () => {
    const { container } = render(<Checkbox label="Food" swatch={{ light: '#9a3412', dark: '#fdba74' }} readOnly />)

    const swatch = container.querySelector('.checkbox__swatch')
    expect(swatch).toHaveAttribute('aria-hidden', 'true')
    expect(swatch.style.getPropertyValue('--swatch')).toBe('#9a3412')
    expect(swatch.style.getPropertyValue('--swatch-dark')).toBe('#fdba74')
    expect(screen.getByRole('checkbox', { name: 'Food' })).toBeInTheDocument()
  })
})
