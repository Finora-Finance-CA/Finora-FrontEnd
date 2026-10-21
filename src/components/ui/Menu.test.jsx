import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Menu from './Menu'

const onEdit = vi.fn()
const onDelete = vi.fn()

function renderMenu() {
  render(
    <>
      <Menu
        label="Actions for Lunch"
        items={[
          { label: 'Edit', onSelect: onEdit },
          { label: 'Delete', onSelect: onDelete, tone: 'danger' },
        ]}
      />
      <button type="button">Elsewhere</button>
    </>
  )
  return screen.getByRole('button', { name: 'Actions for Lunch' })
}

beforeEach(() => {
  onEdit.mockReset()
  onDelete.mockReset()
})

describe('Menu', () => {
  it('is a closed menu button named by its label', () => {
    const trigger = renderMenu()

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens on click with focus on the first item, and names the menu after its button', () => {
    const trigger = renderMenu()

    fireEvent.click(trigger)

    const menu = screen.getByRole('menu', { name: 'Actions for Lunch' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', menu.id)
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Edit', 'Delete'])
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus()
  })

  it('opens on the last item with Up Arrow and the first with Down Arrow', () => {
    const trigger = renderMenu()

    fireEvent.keyDown(trigger, { key: 'ArrowUp' })
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus()
  })

  it('moves between items with the arrow keys, wrapping, and with Home and End', () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Lunch' }))
    const menu = screen.getByRole('menu')
    const edit = screen.getByRole('menuitem', { name: 'Edit' })
    const remove = screen.getByRole('menuitem', { name: 'Delete' })

    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(remove).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(edit).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'ArrowUp' })
    expect(remove).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'Home' })
    expect(edit).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'End' })
    expect(remove).toHaveFocus()
  })

  it('closes on Escape and returns focus to its button', () => {
    const trigger = renderMenu()
    fireEvent.click(trigger)

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('runs the chosen item with the button, focused first so a dialog can return focus to it', () => {
    const trigger = renderMenu()
    let focusedWhenRun = null
    onDelete.mockImplementation(() => {
      focusedWhenRun = document.activeElement
    })
    fireEvent.click(trigger)

    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith(trigger)
    expect(focusedWhenRun).toBe(trigger)
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes on a click outside, or when focus leaves it', () => {
    const trigger = renderMenu()
    fireEvent.click(trigger)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    fireEvent.blur(screen.getByRole('menuitem', { name: 'Edit' }), {
      relatedTarget: screen.getByRole('button', { name: 'Elsewhere' }),
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('stays open when focus moves within it, and closes on a second click of its button', () => {
    const trigger = renderMenu()
    fireEvent.click(trigger)

    fireEvent.blur(screen.getByRole('menuitem', { name: 'Edit' }), { relatedTarget: trigger })
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
