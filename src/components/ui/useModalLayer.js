import { useLayoutEffect } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Makes `layerRef` a modal layer while it's on screen. Dialog uses it for every variant
 * (centred dialog, drawer, bottom sheet, navigation sheet), so there's one focus trap.
 *
 * While it's open, the rest of the page is inert (it can't be clicked, tabbed to or read
 * by screen readers), Tab and Shift+Tab stay inside the layer, and the page behind
 * doesn't scroll. When it closes, focus goes to the first of these still on the page:
 * `returnFocusRef` (normally the button that opened it), whatever had focus when it
 * opened, then `fallbackFocusRef` (for when the opener is gone, e.g. its row was
 * deleted). Pass the opener explicitly: some browsers, like Safari, don't focus a button
 * when it's clicked.
 *
 * @param {{ current: HTMLElement|null }} layerRef The layer; its parent is the backdrop.
 * @param {object} options
 * @param {() => void} options.onClose Called on Escape.
 * @param {boolean} [options.canClose=true] False while a request is running, so Escape does nothing.
 * @param {{ current: HTMLElement|null }} [options.initialFocusRef] What to focus first. Defaults to the first control.
 * @param {{ current: HTMLElement|null }} [options.returnFocusRef]
 * @param {{ current: HTMLElement|null }} [options.fallbackFocusRef]
 * @returns {(event: KeyboardEvent) => void} The layer's keydown handler.
 */
export function useModalLayer(layerRef, { onClose, canClose = true, initialFocusRef, returnFocusRef, fallbackFocusRef }) {
  // A layout effect, so focus and inertness change in the same update that shows or
  // removes the layer; a passive effect's cleanup can run later when a layer closes
  // after a request.
  useLayoutEffect(() => {
    const layer = layerRef.current
    // In order of preference. Each is checked again on close, in case it has gone.
    const focusOnClose = [returnFocusRef?.current, document.activeElement, fallbackFocusRef?.current]
    const backdrop = layer.parentElement
    // Elements that were already inert stay that way when the layer closes.
    const others = [...document.body.children].filter(
      (element) => element !== backdrop && !element.hasAttribute('inert')
    )
    const previousOverflow = document.body.style.overflow

    others.forEach((element) => element.setAttribute('inert', ''))
    document.body.style.overflow = 'hidden'
    ;(initialFocusRef?.current ?? layer.querySelector(FOCUSABLE) ?? layer).focus()

    return () => {
      others.forEach((element) => element.removeAttribute('inert'))
      document.body.style.overflow = previousOverflow
      // React may still be removing other elements in this update (e.g. the row the
      // layer deleted), so pick where focus goes once it has finished, before paint.
      queueMicrotask(() => {
        focusOnClose.find((element) => element?.isConnected && element !== document.body)?.focus()
      })
    }
  }, [layerRef, initialFocusRef, returnFocusRef, fallbackFocusRef])

  function keepFocusInside(event) {
    const focusable = [...layerRef.current.querySelectorAll(FOCUSABLE)]
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

  return function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (canClose) onClose()
      return
    }
    if (event.key === 'Tab') keepFocusInside(event)
  }
}
