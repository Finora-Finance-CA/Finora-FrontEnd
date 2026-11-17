// The Toast primitive (US-58): short success messages in one polite live region, which
// close by themselves and never take focus.

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Dialog from './Dialog'
import { ToastProvider } from './Toast'
import { TOAST_DURATION_MS, useToast } from './useToast'

function Sender({ messages = ['Goal created.'] }) {
  const { showToast } = useToast()
  const index = useRef(0)
  return (
    <button type="button" onClick={() => showToast(messages[index.current++ % messages.length])}>
      Save
    </button>
  )
}

function region() {
  return document.querySelector('[data-live-region]')
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('renders one polite live region, empty until there is something to say', () => {
    render(
      <ToastProvider>
        <Sender />
      </ToastProvider>
    )

    expect(region()).toHaveAttribute('role', 'status')
    expect(region()).toHaveAttribute('aria-live', 'polite')
    expect(region()).toBeEmptyDOMElement()
  })

  it('shows the message without moving focus', () => {
    render(
      <ToastProvider>
        <Sender />
      </ToastProvider>
    )
    const button = screen.getByRole('button', { name: 'Save' })
    button.focus()

    fireEvent.click(button)

    expect(within(region()).getByText('Goal created.')).toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it(`closes by itself after ${TOAST_DURATION_MS} ms`, () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Sender />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1))
    expect(within(region()).getByText('Goal created.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(within(region()).queryByText('Goal created.')).not.toBeInTheDocument()
  })

  it('stays while the pointer is over it, and closes after the pointer leaves', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Sender />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.pointerEnter(region())
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 3))
    expect(within(region()).getByText('Goal created.')).toBeInTheDocument()

    fireEvent.pointerLeave(region())
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))
    expect(within(region()).queryByText('Goal created.')).not.toBeInTheDocument()
  })

  it('has a Dismiss button', () => {
    render(
      <ToastProvider>
        <Sender />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.click(within(region()).getByRole('button', { name: 'Dismiss' }))

    expect(region()).toBeEmptyDOMElement()
  })

  it('shows at most three at once, dropping the oldest', () => {
    render(
      <ToastProvider>
        <Sender messages={['One.', 'Two.', 'Three.', 'Four.']} />
      </ToastProvider>
    )
    const button = screen.getByRole('button', { name: 'Save' })

    for (let i = 0; i < 4; i += 1) fireEvent.click(button)

    expect([...region().querySelectorAll('.toast__message')].map((el) => el.textContent)).toEqual(['Two.', 'Three.', 'Four.'])
  })

  it('stays readable (not inert) while a dialog is open', () => {
    function WithDialog() {
      const [open, setOpen] = useState(true)
      const ref = useRef(null)
      return (
        <>
          <Sender />
          {open && (
            <Dialog title="Edit" onClose={() => setOpen(false)}>
              <button ref={ref} type="button">
                Inside
              </button>
            </Dialog>
          )}
        </>
      )
    }
    render(
      <ToastProvider>
        <WithDialog />
      </ToastProvider>
    )

    expect(region()).not.toHaveAttribute('inert')
  })

  it('clears every toast on request, e.g. when a different user signs in', () => {
    function Clearer() {
      const { clearToasts } = useToast()
      return (
        <button type="button" onClick={clearToasts}>
          Clear
        </button>
      )
    }
    render(
      <ToastProvider>
        <Sender />
        <Clearer />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(region()).toBeEmptyDOMElement()
  })

  it('refuses to work outside a ToastProvider, so a missing one is never silent', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Sender />)).toThrow('useToast must be used inside a ToastProvider.')
  })
})
