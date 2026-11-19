import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeAll } from 'vitest'
import App from '../App'
import { AuthProvider } from '../context/AuthContext'

// Every page is its own lazy chunk (App.jsx), and the dashboard's charts load Recharts,
// the largest one. Compiling them for the first time can take longer than a test's 5
// seconds while every test file runs at once, which made the first test in a file time
// out now and then. Loading them once, before any test in a file that renders the app,
// with time to spare, means every test finds them ready. React.lazy then resolves to
// the same, already loaded modules.
beforeAll(
  () =>
    Promise.all([
      import('../pages/AuthPage'),
      import('../pages/BudgetsPage'),
      import('../pages/DashboardPage'),
      import('../pages/GoalsPage'),
      import('../pages/SummaryPage'),
      import('../pages/TransactionsPage'),
      import('../dashboard/CategoryBars'),
      import('../dashboard/TrendBars'),
    ]),
  60_000
)

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
