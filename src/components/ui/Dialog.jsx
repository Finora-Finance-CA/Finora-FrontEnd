import { X } from 'lucide-react'
import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import IconButton from './IconButton'
import { useModalLayer } from './useModalLayer'
import './Dialog.css'

/**
 * A modal layer. It's open while it's rendered: show it to open it, stop rendering it to
 * close it. It asks to close (Escape, the Close button, or a tap on the backdrop of a
 * sheet) through `onClose`. Focus, inertness and scrolling are handled by useModalLayer.
 *
 * Variants:
 * - 'dialog': centred, for confirmations.
 * - 'drawer': from the right on wide screens and from the bottom on phones, for forms.
 * - 'sheet': from the bottom, e.g. filters on a phone.
 * - 'nav': from the left, for the main navigation on small screens.
 * Every variant but 'dialog' has a Close button; sheets also close on a backdrop tap.
 *
 * Built by hand rather than with <dialog>.showModal() so that it behaves the same in the
 * tests (jsdom has no showModal) as in browsers.
 *
 * @param {object} props
 * @param {string} props.title Shown as the heading and used as the dialog's name.
 * @param {() => void} props.onClose
 * @param {'dialog'|'drawer'|'sheet'|'nav'} [props.variant='dialog']
 * @param {boolean} [props.canClose=true] False while a request is running, so nothing closes it.
 * @param {{ current: HTMLElement|null }} [props.initialFocusRef] What to focus first. Defaults to the first control.
 * @param {{ current: HTMLElement|null }} [props.returnFocusRef] Where focus goes on close.
 * @param {{ current: HTMLElement|null }} [props.fallbackFocusRef] Where focus goes if that's gone.
 * @param {import('react').ReactNode} props.children
 */
export default function Dialog({
  title,
  onClose,
  variant = 'dialog',
  canClose = true,
  initialFocusRef,
  returnFocusRef,
  fallbackFocusRef,
  children,
}) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const handleKeyDown = useModalLayer(dialogRef, {
    onClose,
    canClose,
    initialFocusRef,
    returnFocusRef,
    fallbackFocusRef,
  })
  const closesOnBackdrop = variant === 'sheet' || variant === 'nav'

  function handleBackdropPointerDown(event) {
    if (closesOnBackdrop && canClose && event.target === event.currentTarget) onClose()
  }

  return createPortal(
    <div className={`dialog-backdrop dialog-backdrop--${variant}`} onPointerDown={handleBackdropPointerDown}>
      <div
        ref={dialogRef}
        className={`dialog dialog--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="dialog__header">
          <h2 id={titleId}>{title}</h2>
          {variant !== 'dialog' && <IconButton icon={X} label="Close" onClick={onClose} disabled={!canClose} />}
        </div>
        <div className="dialog__body">{children}</div>
      </div>
    </div>,
    document.body
  )
}
