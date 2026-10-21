import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Pill from './Pill'

describe('Pill', () => {
  it('shows its text with the neutral colours by default', () => {
    render(<Pill>Food</Pill>)

    const pill = screen.getByText('Food')
    expect(pill).toHaveClass('pill')
    expect(pill).not.toHaveAttribute('style')
  })

  it('passes light and dark colours as CSS variables', () => {
    const colors = { light: { text: '#111111', background: '#eeeeee' }, dark: { text: '#dddddd', background: '#222222' } }
    render(
      <Pill colors={colors} className="category-label">
        Food
      </Pill>
    )

    const pill = screen.getByText('Food')
    expect(pill).toHaveClass('pill', 'category-label')
    expect(pill.style.getPropertyValue('--pill-text')).toBe('#111111')
    expect(pill.style.getPropertyValue('--pill-bg')).toBe('#eeeeee')
    expect(pill.style.getPropertyValue('--pill-text-dark')).toBe('#dddddd')
    expect(pill.style.getPropertyValue('--pill-bg-dark')).toBe('#222222')
  })
})
