import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Panel from './Panel'

describe('Panel', () => {
  it('is a section named by its heading, with the content inside the same box', () => {
    render(
      <Panel title="Budget alerts" action={<a href="/budgets">Manage budgets</a>}>
        <p>Food is close to its limit.</p>
      </Panel>
    )

    const section = screen.getByRole('region', { name: 'Budget alerts' })
    expect(section).toHaveClass('card', 'panel')
    expect(within(section).getByRole('heading', { level: 2, name: 'Budget alerts' })).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Manage budgets' })).toBeInTheDocument()
    expect(within(section).getByText('Food is close to its limit.')).toBeInTheDocument()
  })

  it('says when newer data is loading, and leaves out an empty action', () => {
    const { container, rerender } = render(<Panel title="Spending">content</Panel>)
    const section = screen.getByRole('region', { name: 'Spending' })
    expect(section).not.toHaveAttribute('aria-busy')
    expect(container.querySelector('.panel__action')).toBeNull()

    rerender(
      <Panel title="Spending" busy>
        content
      </Panel>
    )
    expect(screen.getByRole('region', { name: 'Spending' })).toHaveAttribute('aria-busy', 'true')
  })
})
