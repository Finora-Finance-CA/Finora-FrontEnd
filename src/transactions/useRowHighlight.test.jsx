import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HIGHLIGHT_MS, useRowHighlight } from './useRowHighlight'

describe('useRowHighlight', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('highlights a row, then lets it go after HIGHLIGHT_MS', () => {
    const { result } = renderHook(() => useRowHighlight())
    expect(result.current[0]).toBeNull()

    act(() => result.current[1]('42'))
    expect(result.current[0]).toBe('42')

    act(() => vi.advanceTimersByTime(HIGHLIGHT_MS - 1))
    expect(result.current[0]).toBe('42')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current[0]).toBeNull()
  })

  it('moves to the newest row and restarts the clock', () => {
    const { result } = renderHook(() => useRowHighlight())

    act(() => result.current[1]('1'))
    act(() => vi.advanceTimersByTime(HIGHLIGHT_MS - 100))
    act(() => result.current[1]('2'))
    act(() => vi.advanceTimersByTime(200))
    expect(result.current[0]).toBe('2')
  })

  it('stops its timer when unmounted', () => {
    const { result, unmount } = renderHook(() => useRowHighlight())
    act(() => result.current[1]('1'))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
