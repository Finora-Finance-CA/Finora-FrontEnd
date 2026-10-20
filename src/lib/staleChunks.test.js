import { describe, expect, it, vi } from 'vitest'
import { reloadOnStaleChunk } from './staleChunks'

function setUp({ storage = new Map(), now = () => 100_000 } = {}) {
  const target = new EventTarget()
  target.location = { reload: vi.fn() }
  const store = storage instanceof Map
    ? { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
    : storage
  reloadOnStaleChunk({ target, storage: store, now })
  return target
}

function failChunk(target) {
  const event = new Event('vite:preloadError', { cancelable: true })
  target.dispatchEvent(event)
  return event
}

describe('reloadOnStaleChunk', () => {
  it('reloads once when a page chunk fails to load, and stops the error', () => {
    const target = setUp()

    const event = failChunk(target)

    expect(target.location.reload).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('lets the error through if it fails again right after reloading', () => {
    const storage = new Map([['finora:stale-chunk-reload', '95000']])
    const target = setUp({ storage, now: () => 100_000 })

    const event = failChunk(target)

    expect(target.location.reload).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('reloads again for a later redeploy', () => {
    const storage = new Map([['finora:stale-chunk-reload', '1000']])
    const target = setUp({ storage, now: () => 100_000 })

    failChunk(target)

    expect(target.location.reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when storage is blocked, since a loop could not be stopped', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError')
      },
    }
    const target = setUp({ storage: blocked })

    failChunk(target)

    expect(target.location.reload).not.toHaveBeenCalled()
  })
})
