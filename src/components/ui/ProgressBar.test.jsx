import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ProgressBar from './ProgressBar'

const fill = (bar) => bar.querySelector('.progress-bar__fill')

describe('ProgressBar', () => {
  it('is a named progressbar with its value from 0 to 100', () => {
    render(<ProgressBar value={80} label="Food spending" valueText="80% used, $95.13 left" />)

    const bar = screen.getByRole('progressbar', { name: 'Food spending' })
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).toHaveAttribute('aria-valuenow', '80')
    expect(bar).toHaveAttribute('aria-valuetext', '80% used, $95.13 left')
    expect(fill(bar).style.getPropertyValue('--progress')).toBe('0.8')
  })

  it('caps the fill and aria-valuenow at 100, while valueText keeps the real figure', () => {
    render(<ProgressBar value={115} label="Transportation spending" valueText="115% used, $23.15 over" />)

    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(bar).toHaveAttribute('aria-valuetext', '115% used, $23.15 over')
    expect(fill(bar).style.getPropertyValue('--progress')).toBe('1')
  })

  it.each([
    [0, '0', '0'],
    [-5, '0', '0'],
    [NaN, '0', '0'],
    [100, '1', '100'],
  ])('shows %s as a fill of %s', (value, progress, now) => {
    render(<ProgressBar value={value} label="Spending" />)

    const bar = screen.getByRole('progressbar')
    expect(fill(bar).style.getPropertyValue('--progress')).toBe(progress)
    expect(bar).toHaveAttribute('aria-valuenow', now)
  })

  it.each([
    [undefined, 'progress-bar--default'],
    ['warning', 'progress-bar--warning'],
    ['danger', 'progress-bar--danger'],
    ['purple', 'progress-bar--default'],
  ])('uses the %s tone', (tone, className) => {
    render(<ProgressBar value={50} label="Spending" tone={tone} />)

    expect(screen.getByRole('progressbar')).toHaveClass('progress-bar', className)
  })
})
