// Which transaction was just added or edited, so its row can be highlighted for a moment
// and the eye finds it in the list. Display only: it never changes the list itself.

import { useCallback, useEffect, useRef, useState } from 'react'

// How long the row stays highlighted before it fades back (matches --highlight-hold).
export const HIGHLIGHT_MS = 1600

/**
 * @returns {[string|number|null, (id: string|number) => void]} The highlighted id, or
 *   null, and a function that highlights one. Highlighting another restarts the clock.
 */
export function useRowHighlight() {
  const [highlightedId, setHighlightedId] = useState(null)
  const timerRef = useRef(null)

  const highlight = useCallback((id) => {
    clearTimeout(timerRef.current)
    setHighlightedId(id)
    timerRef.current = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return [highlightedId, highlight]
}
