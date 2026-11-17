// US-57: whatever breaks while the app renders, the screen is never left blank. A page
// whose code doesn't download offline says so, with Try again.

import { act, fireEvent, render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lazyPage } from '../lib/lazyPage'
import { ErrorBoundary, RouteErrorBoundary } from './ErrorBoundary'

const CHUNK_ERROR = () => new TypeError('Failed to fetch dynamically imported module: /assets/GoalsPage-abc.js')

let shouldThrow
function Fragile() {
  if (shouldThrow) throw new Error('Cannot read properties of undefined (reading "goals")')
  return <p>Page content</p>
}

function setOnline(value) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

beforeEach(() => {
  shouldThrow = true
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('shows a plain-language message instead of a blank screen, never the error text', () => {
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('This part of the app ran into a problem. Try again, or reload the page.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
    expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument()
    expect(console.error).toHaveBeenCalled()
  })

  it('shows the content again on Try again once it works', () => {
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>
    )
    shouldThrow = false

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('fills the screen when it is the app-wide boundary', () => {
    render(
      <ErrorBoundary variant="app">
        <Fragile />
      </ErrorBoundary>
    )

    expect(screen.getByRole('main')).toHaveClass('error-boundary--app')
  })
})

describe('a page whose code fails to download', () => {
  function renderLazy(load) {
    const Page = lazyPage(load)
    return render(
      <ErrorBoundary>
        <Suspense fallback={<p>Loading page…</p>}>
          <Page />
        </Suspense>
      </ErrorBoundary>
    )
  }

  it('says "You appear to be offline" when offline, with Try again, and loads on retry', async () => {
    setOnline(false)
    const load = vi.fn().mockRejectedValueOnce(CHUNK_ERROR()).mockResolvedValue({ default: () => <p>Goals page</p> })
    renderLazy(load)

    expect(await screen.findByText('You appear to be offline')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Check your connection, then try again.')
    expect(screen.queryByRole('button', { name: 'Reload page' })).not.toBeInTheDocument()

    setOnline(true)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Goals page')).toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('tries again by itself as soon as the connection is back', async () => {
    setOnline(false)
    const load = vi.fn().mockRejectedValueOnce(CHUNK_ERROR()).mockResolvedValue({ default: () => <p>Goals page</p> })
    renderLazy(load)
    await screen.findByText('You appear to be offline')

    setOnline(true)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(await screen.findByText('Goals page')).toBeInTheDocument()
  })

  it('says the page didn’t load when online, with Try again and Reload page', async () => {
    setOnline(true)
    renderLazy(vi.fn().mockRejectedValue(CHUNK_ERROR()))

    expect(await screen.findByText("This page didn't load")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
  })
})

describe('RouteErrorBoundary', () => {
  it('clears the error when the user opens another page', () => {
    render(
      <MemoryRouter initialEntries={['/broken']}>
        <Link to="/fine">Fine page</Link>
        <RouteErrorBoundary>
          <Routes>
            <Route path="/broken" element={<Fragile />} />
            <Route path="/fine" element={<p>Fine content</p>} />
          </Routes>
        </RouteErrorBoundary>
      </MemoryRouter>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Fine page' }))

    expect(screen.getByText('Fine content')).toBeInTheDocument()
  })
})
