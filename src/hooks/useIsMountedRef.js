import { useEffect, useRef } from 'react'

/**
 * A ref that is true while the component is on screen. Async work checks it before
 * updating state, so nothing changes after the component has closed.
 */
export function useIsMountedRef() {
  const isMountedRef = useRef(false)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])
  return isMountedRef
}
