import { fireEvent, render, screen } from '@testing-library/react'
import { Search } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import Input from './Input'

describe('Input', () => {
  it('is a plain input when it has no icon or trailing content', () => {
    const { container } = render(<Input aria-label="Name" />)

    expect(container.firstChild).toBe(screen.getByRole('textbox', { name: 'Name' }))
    expect(screen.getByRole('textbox')).toHaveClass('input')
  })

  it('shows a decorative icon inside the box', () => {
    render(<Input type="search" aria-label="Search" icon={Search} />)

    const input = screen.getByRole('searchbox', { name: 'Search' })
    expect(input).toHaveClass('input--with-icon')
    expect(input.parentElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('puts trailing content, like a button, inside the end of the box', () => {
    render(<Input aria-label="Password" trailing={<button type="button">Show</button>} />)

    expect(screen.getByRole('textbox', { name: 'Password' })).toHaveClass('input--with-trailing')
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument()
  })

  it('passes value, onChange and a ref to the input', () => {
    const onChange = vi.fn()
    const ref = { current: null }
    render(<Input aria-label="Name" value="Ana" onChange={onChange} ref={ref} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ann' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(ref.current).toBe(screen.getByRole('textbox'))
  })
})
