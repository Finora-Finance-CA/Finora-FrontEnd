// How wide a chart's box is, so a chart can switch to a compact layout when it's narrow
// (US-56): fewer, shorter labels that don't overlap on a phone.

import { useCallback, useEffect, useState } from 'react'

// Below this width (in CSS pixels) a chart uses its compact layout.
export const COMPACT_CHART_WIDTH = 480

/**
 * @returns {[(element: HTMLElement|null) => void, number]} A ref to put on the chart's
 *   box, and its current width (0 until it's been measured, e.g. in tests).
 */
export function useContainerWidth() {
  const [element, setElement] = useState(null)
  const [width, setWidth] = useState(0)
  const ref = useCallback((node) => setElement(node), [])

  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [ref, width]
}

/** True when a measured width is narrow enough for the compact layout. */
export function isCompactWidth(width) {
  return width > 0 && width < COMPACT_CHART_WIDTH
}
