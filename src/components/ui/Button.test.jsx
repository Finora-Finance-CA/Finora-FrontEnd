import { fireEvent, render, screen } from '@testing-library/react'
import { Plus } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'

describe('Button', () => {
  it('is a plain button named by its text, so it never submits a form by accident', () => {
    render(<Button>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('button', 'button--secondary', 'button--md')
  })

  it('can be a submit button', () => {
    render(<Button type="submit">Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit')
  })

  it('applies the variant, size and full width', () => {
    render(
      <Button variant="primary" size="sm" fullWidth>
        Add
      </Button>
    )

    expect(screen.getByRole('button', { name: 'Add' })).toHaveClass('button--primary', 'button--sm', 'button--full')
  })

  it('shows its icon without adding it to the name', () => {
    render(<Button icon={Plus}>Add transaction</Button>)

    const button = screen.getByRole('button', { name: 'Add transaction' })
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('calls onClick, but not when disabled', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Go</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('passes a ref to the button element', () => {
    const ref = { current: null }
    render(<Button ref={ref}>Go</Button>)

    expect(ref.current).toBe(screen.getByRole('button', { name: 'Go' }))
  })
})
