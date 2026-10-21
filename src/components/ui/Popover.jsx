import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import Button from './Button'
import './Popover.css'

const FOCUSABLE = 'input:not([disabled]), button:not([disabled]), select:not([disabled]), a[href]'

/**
 * A button that shows a small panel of controls under it, e.g. a filter. It isn't modal:
 * the rest of the page still works. Opening it moves focus into the panel (to the checked
 * option if there is one); Escape closes it and puts focus back on the button; a click
 * outside or tabbing away closes it.
 *
 * @param {object} props
 * @param {string} props.label Names the panel for screen readers, e.g. "Date range".
 * @param {import('react').ReactNode} props.buttonContent What the button shows; it's also its name.
 * @param {'start'|'end'} [props.align='start'] Which edge of the button the panel lines up with.
 * @param {import('react').ReactNode} props.children
 */
export default function Popover({ label, buttonContent, align = 'start', className, children }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()

  useLayoutEffect(() => {
    if (!open) return
    const panel = panelRef.current
    ;(panel.querySelector('input:checked') ?? panel.querySelector(FOCUSABLE) ?? panel).focus()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function closeIfOutside(event) {
      if (!wrapperRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeIfOutside)
    return () => document.removeEventListener('pointerdown', closeIfOutside)
  }, [open])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
      buttonRef.current.focus()
    }
  }

  function handleBlur(event) {
    if (event.relatedTarget && !wrapperRef.current.contains(event.relatedTarget)) setOpen(false)
  }

  return (
    <div className={['popover', className].filter(Boolean).join(' ')} ref={wrapperRef} onBlur={handleBlur}>
      <Button
        ref={buttonRef}
        className="popover__button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {buttonContent}
        <ChevronDown className="popover__chevron" />
      </Button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className={`popover__panel popover__panel--${align}`}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      )}
    </div>
  )
}
