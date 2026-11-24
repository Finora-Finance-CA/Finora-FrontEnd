import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('shows a title, detail and an action, with no decorative icon', () => {
    const { container } = render(
      <EmptyState title="No transactions yet." action={<button type="button">Add one</button>}>
        Add your first one to get started.
      </EmptyState>
    )

    expect(screen.getByText('No transactions yet.')).toBeInTheDocument()
    expect(screen.getByText('Add your first one to get started.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add one' })).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('leaves out the detail and action when there are none', () => {
    const { container } = render(<EmptyState title="Nothing here." />)

    expect(container.querySelector('.empty-state__detail')).toBeNull()
    expect(container.querySelector('.empty-state__action')).toBeNull()
  })
})
