import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import App from '../App'
import { AuthProvider } from '../context/AuthContext'

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>
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
