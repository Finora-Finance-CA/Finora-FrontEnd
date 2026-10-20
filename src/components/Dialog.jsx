import { useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './Dialog.css'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * A modal dialog. It's open while it's rendered: show it to open it, stop rendering it
 * to close it. The dialog asks to close (Escape) through `onClose`.
 *
 * While it's open, the rest of the page is inert (it can't be clicked, tabbed to or
 * read by screen readers), Tab and Shift+Tab stay inside the dialog, and the page
 * behind doesn't scroll. When it closes, focus goes to the first of these still on the
 * page: `returnFocusRef` (normally the button that opened it), whatever had focus when
 * it opened, then `fallbackFocusRef` (for when the opener is gone, e.g. its row was
 * deleted). Pass the opener explicitly: some browsers, like Safari, don't focus a
 * button when it's clicked.
 *
 * Built by hand rather than with <dialog>.showModal() so that it behaves the same in
 * the tests (jsdom has no showModal) as in browsers.
 *
 * @param {object} props
 * @param {string} props.title Shown as the heading and used as the dialog's name.
 * @param {() => void} props.onClose
 * @param {boolean} [props.canClose=true] False while a request is running, so Escape does nothing.
 * @param {{ current: HTMLElement|null }} [props.initialFocusRef] What to focus first. Defaults to the first control.
 * @param {{ current: HTMLElement|null }} [props.returnFocusRef] Where focus goes on close.
 * @param {{ current: HTMLElement|null }} [props.fallbackFocusRef] Where focus goes if that's gone.
 * @param {import('react').ReactNode} props.children
 */
export default function Dialog({
  title,
  onClose,
  canClose = true,
  initialFocusRef,
  returnFocusRef,
  fallbackFocusRef,
  children,
}) {
  const titleId = useId()
  const dialogRef = useRef(null)

  // A layout effect, so focus and inertness change in the same update that shows or
  // removes the dialog; a passive effect's cleanup can run later when a dialog closes
  // after a request.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    // In order of preference. Each is checked again on close, in case it has gone.
    const focusOnClose = [returnFocusRef?.current, document.activeElement, fallbackFocusRef?.current]
    const backdrop = dialog.parentElement
    // Elements that were already inert stay that way when the dialog closes.
    const others = [...document.body.children].filter(
      (element) => element !== backdrop && !element.hasAttribute('inert')
    )
    const previousOverflow = document.body.style.overflow

    others.forEach((element) => element.setAttribute('inert', ''))
    document.body.style.overflow = 'hidden'
    ;(initialFocusRef?.current ?? dialog.querySelector(FOCUSABLE) ?? dialog).focus()

    return () => {
      others.forEach((element) => element.removeAttribute('inert'))
      document.body.style.overflow = previousOverflow
      // React may still be removing other elements in this update (e.g. the row the
      // dialog deleted), so pick where focus goes once it has finished, before paint.
      queueMicrotask(() => {
        focusOnClose.find((element) => element?.isConnected && element !== document.body)?.focus()
      })
    }
  }, [initialFocusRef, returnFocusRef, fallbackFocusRef])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (canClose) onClose()
      return
    }
    if (event.key === 'Tab') keepFocusInside(event)
  }

  function keepFocusInside(event) {
    const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable.at(-1)
    const current = document.activeElement
    const isInside = focusable.includes(current)

    if (event.shiftKey && (current === first || !isInside)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (current === last || !isInside)) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body
  )
}
