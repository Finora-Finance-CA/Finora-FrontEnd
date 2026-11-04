import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TransactionsSyncProvider } from './TransactionsSyncContext'
import { useTransactionsRefreshKey, useTransactionsSync } from './useTransactionsSync'

// Shows the version and the refresh key, with a button that notifies.
function Probe() {
  const { version, notifyTransactionsChanged } = useTransactionsSync()
  const key = useTransactionsRefreshKey()
  return (
    <>
      <output data-testid="version">{version}</output>
      <output data-testid="key">{key}</output>
      <button onClick={notifyTransactionsChanged}>Notify</button>
    </>
  )
}

const shown = (id) => screen.getByTestId(id).textContent

function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

afterEach(() => {
  // Back to jsdom's own value.
  delete document.visibilityState
})

describe('TransactionsSyncProvider and useTransactionsRefreshKey (US-38)', () => {
  it('changes the refresh key each time a change is notified', () => {
    render(
      <TransactionsSyncProvider>
        <Probe />
      </TransactionsSyncProvider>
    )
    expect(shown('key')).toBe('0.0')

    fireEvent.click(screen.getByRole('button', { name: 'Notify' }))
    fireEvent.click(screen.getByRole('button', { name: 'Notify' }))

    expect(shown('version')).toBe('2')
    expect(shown('key')).toBe('2.0')
  })

  it('changes the key when the tab is shown again, not when it is hidden', () => {
    render(
      <TransactionsSyncProvider>
        <Probe />
      </TransactionsSyncProvider>
    )

    setVisibility('hidden')
    expect(shown('key')).toBe('0.0')
    setVisibility('visible')
    expect(shown('key')).toBe('0.1')
  })

  it('does nothing outside a provider, so components still work on their own', () => {
    render(<Probe />)

    fireEvent.click(screen.getByRole('button', { name: 'Notify' }))

    expect(shown('version')).toBe('0')
    expect(shown('key')).toBe('0.0')
  })
})
