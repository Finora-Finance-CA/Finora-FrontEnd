import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import Dialog from './Dialog'

function Harness({ variant = 'dialog', canClose = true, onClose = () => {} }) {
  const [open, setOpen] = useState(false)
  const openerRef = useRef(null)
  return (
    <>
      <main>
        <button ref={openerRef} type="button" onClick={() => setOpen(true)}>
          Open
        </button>
      </main>
      {open && (
        <Dialog
          title="Edit expense"
          variant={variant}
          canClose={canClose}
          returnFocusRef={openerRef}
          onClose={() => {
            onClose()
            setOpen(false)
          }}
        >
          <input aria-label="Amount" />
          <button type="button">Save</button>
        </Dialog>
      )}
    </>
  )
}

function open(props) {
  render(<Harness {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
  return screen.getByRole('dialog', { name: 'Edit expense' })
}

describe('Dialog', () => {
  it('is a modal named by its title, focuses its first control and makes the page inert', () => {
    const dialog = open()

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('textbox', { name: 'Amount' })).toHaveFocus()
    expect(screen.getByRole('main', { hidden: true }).closest('body > *')).toHaveAttribute('inert')
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('keeps Tab and Shift+Tab inside', () => {
    const dialog = open()
    const amount = within(dialog).getByRole('textbox', { name: 'Amount' })
    const save = within(dialog).getByRole('button', { name: 'Save' })

    save.focus()
    fireEvent.keyDown(save, { key: 'Tab' })
    expect(amount).toHaveFocus()

    fireEvent.keyDown(amount, { key: 'Tab', shiftKey: true })
    expect(save).toHaveFocus()
  })

  it('closes on Escape, restores the page and returns focus to the opener', async () => {
    const dialog = open()

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('main').closest('body > *')).not.toHaveAttribute('inert')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus())
  })

  it('ignores Escape while it cannot close', () => {
    const onClose = vi.fn()
    const dialog = open({ canClose: false, onClose })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('has no Close button as a centred dialog', () => {
    const dialog = open()

    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it.each(['drawer', 'sheet', 'nav'])('has a Close button as a %s that closes it', (variant) => {
    const dialog = open({ variant })
    const close = within(dialog).getByRole('button', { name: 'Close' })

    expect(dialog).toHaveClass(`dialog--${variant}`)
    fireEvent.click(close)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables Close while it cannot close', () => {
    const dialog = open({ variant: 'drawer', canClose: false })

    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeDisabled()
  })

  it('does not close a drawer on a backdrop tap, so a half-filled form is not lost', () => {
    const drawer = open({ variant: 'drawer' })
    fireEvent.pointerDown(drawer.parentElement)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes a sheet when its backdrop is tapped, but not when its content is', () => {
    const sheet = open({ variant: 'sheet' })

    fireEvent.pointerDown(within(sheet).getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.pointerDown(sheet.parentElement)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
