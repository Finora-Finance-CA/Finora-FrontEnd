import { createContext, useContext } from 'react'

// Set by ToastProvider (Toast.jsx). Kept in its own file so Toast.jsx only exports
// components, as react-refresh needs.
export const ToastContext = createContext(null)

// How long a toast stays up: within the 3 to 5 seconds people expect for a short message.
export const TOAST_DURATION_MS = 5000

/**
 * Shows short success messages ("Transaction deleted.") in the app's toast region.
 *
 * @returns {{ showToast: (message: string) => void, clearToasts: () => void }}
 * @throws {Error} Outside a ToastProvider, so a missing provider is never silent.
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside a ToastProvider.')
  return context
}
