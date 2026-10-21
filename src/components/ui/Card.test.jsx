import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Card from './Card'

describe('Card', () => {
  it('wraps its content in a padded surface', () => {
    render(<Card>Totals</Card>)

    expect(screen.getByText('Totals')).toHaveClass('card', 'card--padded')
  })

  it('can be another element, without padding, and passes attributes through', () => {
    render(
      <Card as="section" padded={false} aria-label="History">
        Rows
      </Card>
    )

    const card = screen.getByRole('region', { name: 'History' })
    expect(card.tagName).toBe('SECTION')
    expect(card).not.toHaveClass('card--padded')
  })
})
