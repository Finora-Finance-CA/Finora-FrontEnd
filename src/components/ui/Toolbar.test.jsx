import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Toolbar from './Toolbar'

describe('Toolbar', () => {
  it('lays out its controls in a row', () => {
    render(
      <Toolbar>
        <button type="button">One</button>
      </Toolbar>
    )

    expect(screen.getByRole('button', { name: 'One' }).parentElement).toHaveClass('toolbar')
  })

  it('can be a search form with a name', () => {
    render(<Toolbar as="form" role="search" aria-label="Search and filter transactions" />)

    expect(screen.getByRole('search', { name: 'Search and filter transactions' }).tagName).toBe('FORM')
  })
})
