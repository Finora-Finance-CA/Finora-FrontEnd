import { CircleCheck, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import IconButton from './IconButton'
import { TOAST_DURATION_MS, ToastContext } from './useToast'
import './Toast.css'

// How many toasts can show at once; the oldest go first.
const MAX_TOASTS = 3

let nextId = 1

/**
 * Gives the app useToast() and renders the one toast region: a polite live region, so
 * each new message is read out without moving focus. A toast closes by itself after
 * TOAST_DURATION_MS, except while the pointer is over the region or focus is inside it
 * (so there's time to read it), and has a Dismiss button. Toasts are for success only;
 * errors stay next to what failed.
 *
 * The region is marked data-live-region, so an open dialog (useModalLayer) leaves it
 * readable instead of making it inert.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [isPaused, setIsPaused] = useState(false)
  const timersRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message) => {
    if (!message) return
    const id = nextId++
    setToasts((current) => [...current, { id, message }].slice(-MAX_TOASTS))
  }, [])

  // One timer per toast on screen, stopped while paused and started again after.
  useEffect(() => {
    const timers = timersRef.current
    if (isPaused) {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
      return
    }
    for (const { id } of toasts) {
      if (!timers.has(id)) timers.set(id, setTimeout(() => dismiss(id), TOAST_DURATION_MS))
    }
    for (const [id, timer] of timers) {
      if (!toasts.some((toast) => toast.id === id)) {
        clearTimeout(timer)
        timers.delete(id)
      }
    }
  }, [toasts, isPaused, dismiss])

  useEffect(() => {
    const timers = timersRef.current
    return () => timers.forEach((timer) => clearTimeout(timer))
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  function handleBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false)
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="toast-region"
          role="status"
          aria-live="polite"
          data-live-region=""
          onPointerEnter={() => setIsPaused(true)}
          onPointerLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={handleBlur}
        >
          {toasts.map(({ id, message }) => (
            <div key={id} className="toast">
              <CircleCheck className="toast__icon" aria-hidden="true" />
              <p className="toast__message">{message}</p>
              <IconButton icon={X} label="Dismiss" className="toast__dismiss" onClick={() => dismiss(id)} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
