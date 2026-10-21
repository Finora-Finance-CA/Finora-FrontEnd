import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Alert from './Alert'

describe('Alert', () => {
  it('announces an error straight away, with an icon as well as colour', () => {
    render(<Alert>Something went wrong.</Alert>)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong.')
    expect(alert).toHaveClass('alert--error')
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('announces a success politely, as a status', () => {
    render(<Alert tone="success">Saved.</Alert>)

    expect(screen.getByRole('status')).toHaveTextContent('Saved.')
    expect(screen.getByRole('status')).toHaveClass('alert--success')
  })
})
