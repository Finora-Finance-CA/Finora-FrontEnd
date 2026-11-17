// The width check the dashboard charts use to switch to their compact layout (US-56).

import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMPACT_CHART_WIDTH, isCompactWidth, useContainerWidth } from './useContainerWidth'

function Measured() {
  const [ref, width] = useContainerWidth()
  return <div ref={ref}>{width}</div>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isCompactWidth', () => {
  it('is compact only once measured and narrower than the limit', () => {
    expect(isCompactWidth(0)).toBe(false)
    expect(isCompactWidth(320)).toBe(true)
    expect(isCompactWidth(COMPACT_CHART_WIDTH - 1)).toBe(true)
    expect(isCompactWidth(COMPACT_CHART_WIDTH)).toBe(false)
  })
})

describe('useContainerWidth', () => {
  it('reports the box’s width as it changes, and stops watching when it goes', () => {
    let report
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback) {
          report = (width) => callback([{ contentRect: { width } }])
        }
        observe() {}
        disconnect = disconnect
      }
    )
    const { unmount } = render(<Measured />)
    expect(screen.getByText('0')).toBeInTheDocument()

    act(() => report(343.6))
    expect(screen.getByText('344')).toBeInTheDocument()

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
