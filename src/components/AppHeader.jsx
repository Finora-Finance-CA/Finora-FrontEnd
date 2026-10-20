import { NavLink } from 'react-router'
import { useAuth } from '../context/useAuth'
import './buttons.css'
import './AppHeader.css'

const LINKS = [
  { to: '/transactions', label: 'Transactions' },
  { to: '/summary', label: 'Summary' },
  { to: '/budgets', label: 'Budgets' },
]

/**
 * The bar at the top of every page: the app's name, the main navigation, and who is
 * logged in with a Log out button. The navigation and account details only show once
 * someone is signed in. NavLink marks the current page with aria-current="page".
 */
export default function AppHeader() {
  const { user, loading, signOut } = useAuth()
  const signedIn = !loading && Boolean(user)

  return (
    <header className="app-header">
      <a className="app-header__skip" href="#main">
        Skip to main content
      </a>
      <div className="app-header__bar">
        <p className="app-header__brand">Finora</p>

        {signedIn && (
          <nav className="app-header__nav" aria-label="Main">
            <ul>
              {LINKS.map(({ to, label }) => (
                <li key={to}>
                  <NavLink to={to} className="app-header__link">
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {signedIn && (
          <div className="app-header__account">
            <p className="app-header__email">
              <span className="visually-hidden">Logged in as </span>
              {user.email}
            </p>
            <button type="button" className="button button--secondary button--compact" onClick={signOut}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
