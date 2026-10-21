import { fireEvent, render, screen } from '@testing-library/react'
import { Menu } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import IconButton from './IconButton'

describe('IconButton', () => {
  it('is named by its label, with the icon hidden from screen readers', () => {
    render(<IconButton icon={Menu} label="Open menu" />)

    const button = screen.getByRole('button', { name: 'Open menu' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('passes other attributes through, such as aria-expanded', () => {
    const onClick = vi.fn()
    render(<IconButton icon={Menu} label="Open menu" aria-expanded={false} onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Open menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('has a secondary look as well as the default ghost one', () => {
    render(<IconButton icon={Menu} label="More" variant="secondary" />)

    expect(screen.getByRole('button', { name: 'More' })).toHaveClass('icon-button--secondary')
  })
})
