import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Skeleton from './Skeleton'

describe('Skeleton', () => {
  it('is hidden from screen readers and takes its shape', () => {
    const { container } = render(<Skeleton shape="amount" />)

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstChild).toHaveClass('skeleton', 'skeleton--amount')
  })

  it('is a line of text by default', () => {
    const { container } = render(<Skeleton />)

    expect(container.firstChild).toHaveClass('skeleton--text')
  })
})
