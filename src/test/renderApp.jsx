import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import App from '../App'
import { AuthProvider } from '../context/AuthContext'

function CurrentPath() {
  const { pathname, search } = useLocation()
  return (
    <output data-testid="current-path" data-search={search}>
      {pathname}
    </output>
  )
}

/**
 * Renders the whole app (routes, AuthProvider and all) at `path`, the way main.jsx
 * does but with an in-memory router. Supabase is the fake from src/test/setup.js.
 */
export function renderApp(path = '/transactions') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
        <CurrentPath />
      </AuthProvider>
    </MemoryRouter>
  )
}

/** The path the app is showing now. */
export function currentPath() {
  return screen.getByTestId('current-path').textContent
}

/** The query string the app is showing now, e.g. "?page=2", or '' for none. */
export function currentSearch() {
  return screen.getByTestId('current-path').dataset.search
}
