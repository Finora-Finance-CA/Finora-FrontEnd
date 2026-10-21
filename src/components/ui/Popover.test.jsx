import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Popover from './Popover'

function renderPopover(children = <input type="checkbox" aria-label="Food" />) {
  render(
    <>
      <Popover label="Categories" buttonContent="All categories">
        {children}
      </Popover>
      <button type="button">Elsewhere</button>
    </>
  )
  return screen.getByRole('button', { name: 'All categories' })
}

describe('Popover', () => {
  it('is a closed disclosure button named by its content', () => {
    const button = renderPopover()

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens a named, non-modal panel and focuses its first control', () => {
    const button = renderPopover()

    fireEvent.click(button)

    const panel = screen.getByRole('dialog', { name: 'Categories' })
    expect(panel).not.toHaveAttribute('aria-modal')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-controls', panel.id)
    expect(screen.getByRole('checkbox', { name: 'Food' })).toHaveFocus()
  })

  it('focuses the checked option first when there is one', () => {
    const button = renderPopover(
      <>
        <input type="radio" name="range" aria-label="All time" readOnly />
        <input type="radio" name="range" aria-label="This month" checked readOnly />
      </>
    )

    fireEvent.click(button)

    expect(screen.getByRole('radio', { name: 'This month' })).toHaveFocus()
  })

  it('closes on Escape and returns focus to its button', () => {
    const button = renderPopover()
    fireEvent.click(button)

    fireEvent.keyDown(screen.getByRole('checkbox', { name: 'Food' }), { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('closes on a click outside, a second click of its button, or when focus leaves it', () => {
    const button = renderPopover()
    fireEvent.click(button)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(button)
    fireEvent.click(button)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(button)
    fireEvent.blur(screen.getByRole('checkbox', { name: 'Food' }), {
      relatedTarget: screen.getByRole('button', { name: 'Elsewhere' }),
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stays open while its own controls are used', () => {
    const button = renderPopover()
    fireEvent.click(button)

    const food = screen.getByRole('checkbox', { name: 'Food' })
    fireEvent.pointerDown(food)
    fireEvent.click(food)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
