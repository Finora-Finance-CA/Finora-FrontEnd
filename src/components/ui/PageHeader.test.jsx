import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PageHeader from './PageHeader'

describe('PageHeader', () => {
  it('shows the page title as its only h1, with a subtitle and actions', () => {
    render(
      <PageHeader title="Transactions" subtitle="Every income and expense." actions={<button type="button">Add</button>} />
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Transactions')
    expect(screen.getByText('Every income and expense.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('leaves out the subtitle and actions when there are none', () => {
    const { container } = render(<PageHeader title="Budgets" />)

    expect(container.querySelector('.page-header__subtitle')).toBeNull()
    expect(container.querySelector('.page-header__actions')).toBeNull()
  })
})
