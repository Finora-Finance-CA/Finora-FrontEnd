import { Ellipsis } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import IconButton from './IconButton'
import './Menu.css'

/**
 * A button that opens a short list of actions, e.g. Edit and Delete on a row. Follows
 * the WAI-ARIA menu button pattern: Enter, Space or Down Arrow opens it on the first
 * item and Up Arrow on the last; the arrow keys, Home and End move between items;
 * Escape closes it and puts focus back on the button; a click outside or tabbing away
 * closes it. Choosing an item closes the menu, focuses the button again, then calls the
 * item's `onSelect` with the button, so a dialog it opens can return focus there.
 *
 * @param {object} props
 * @param {string} props.label The button's accessible name, e.g. "Actions for Lunch".
 * @param {import('react').ComponentType} [props.icon] Defaults to ⋯.
 * @param {{ label: string, onSelect: (trigger: HTMLButtonElement) => void, tone?: 'danger' }[]} props.items
 */
export default function Menu({ label, icon = Ellipsis, items }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  // Which item gets focus when the menu opens.
  const focusOnOpenRef = useRef('first')
  const triggerId = useId()
  const menuId = useId()

  // Before paint: open upwards if there isn't room below, and focus an item.
  useLayoutEffect(() => {
    if (!open) return
    const menu = menuRef.current
    const triggerBox = triggerRef.current.getBoundingClientRect()
    const menuHeight = menu.getBoundingClientRect().height
    const fitsBelow = triggerBox.bottom + menuHeight + 8 <= window.innerHeight
    menu.dataset.placement = fitsBelow || triggerBox.top < menuHeight ? 'below' : 'above'
    const menuItems = itemsIn(menu)
    ;(focusOnOpenRef.current === 'last' ? menuItems.at(-1) : menuItems[0])?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function closeIfOutside(event) {
      if (!wrapperRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeIfOutside)
    return () => document.removeEventListener('pointerdown', closeIfOutside)
  }, [open])

  function openMenu(focusOn) {
    focusOnOpenRef.current = focusOn
    setOpen(true)
  }

  function closeAndFocusTrigger() {
    setOpen(false)
    triggerRef.current.focus()
  }

  function handleTriggerKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(event.key === 'ArrowUp' ? 'last' : 'first')
    }
  }

  function handleMenuKeyDown(event) {
    const menuItems = itemsIn(menuRef.current)
    const index = menuItems.indexOf(document.activeElement)
    const moves = {
      ArrowDown: (index + 1) % menuItems.length,
      ArrowUp: (index - 1 + menuItems.length) % menuItems.length,
      Home: 0,
      End: menuItems.length - 1,
    }
    if (event.key in moves) {
      event.preventDefault()
      menuItems[moves[event.key]].focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeAndFocusTrigger()
    }
  }

  // Tabbing out of the menu closes it. Moving between the button and the items doesn't.
  function handleBlur(event) {
    if (event.relatedTarget && !wrapperRef.current.contains(event.relatedTarget)) setOpen(false)
  }

  function choose(item) {
    closeAndFocusTrigger()
    item.onSelect(triggerRef.current)
  }

  return (
    <div className="menu" ref={wrapperRef} onBlur={handleBlur}>
      <IconButton
        ref={triggerRef}
        id={triggerId}
        icon={icon}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu('first'))}
        onKeyDown={handleTriggerKeyDown}
      />
      {open && (
        <ul ref={menuRef} id={menuId} className="menu__list" role="menu" aria-labelledby={triggerId} onKeyDown={handleMenuKeyDown}>
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={`menu__item${item.tone === 'danger' ? ' menu__item--danger' : ''}`}
                onClick={() => choose(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function itemsIn(menu) {
  return [...menu.querySelectorAll('[role="menuitem"]')]
}
