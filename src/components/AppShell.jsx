import { ArrowLeftRight, ChartPie, LogOut, Menu, Wallet } from 'lucide-react'
import { Suspense, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../context/useAuth'
import Logo from './Logo'
import PageLoading from './PageLoading'
import Button from './ui/Button'
import Dialog from './ui/Dialog'
import IconButton from './ui/IconButton'
import './AppShell.css'

const LINKS = [
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/summary', label: 'Summary', icon: ChartPie },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
]

/**
 * The frame around every signed-in page. On wide screens, a fixed sidebar with the logo,
 * the main navigation and, at the bottom, who is logged in with Log out. On smaller
 * screens, a top bar with the logo and a menu button that opens the same navigation in
 * a sheet. NavLink marks the current page with aria-current="page". The page itself
 * renders into <main id="main">, which the skip link jumps to.
 */
export default function AppShell() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="app-shell">
      <a className="app-shell__skip" href="#main">
        Skip to main content
      </a>

      <div className="app-shell__sidebar">
        <Logo className="app-shell__logo" />
        <MainNav />
        <Account email={user.email} onSignOut={signOut} />
      </div>

      <header className="app-shell__topbar">
        <Logo />
        <IconButton
          ref={menuButtonRef}
          icon={Menu}
          label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        />
      </header>

      <main id="main" className="app-shell__main" tabIndex={-1}>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      {menuOpen && (
        <Dialog variant="nav" title="Menu" onClose={closeMenu} returnFocusRef={menuButtonRef}>
          <MainNav onNavigate={closeMenu} />
          <Account email={user.email} onSignOut={signOut} />
        </Dialog>
      )}
    </div>
  )
}

function MainNav({ onNavigate }) {
  return (
    <nav className="main-nav" aria-label="Main">
      <ul>
        {LINKS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} className="main-nav__link" onClick={onNavigate}>
              <Icon className="main-nav__icon" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Log out sits apart from the page links, at the bottom.
function Account({ email, onSignOut }) {
  return (
    <div className="account">
      <p className="account__email">
        <span className="visually-hidden">Logged in as </span>
        {email}
      </p>
      <Button variant="ghost" size="sm" icon={LogOut} onClick={onSignOut}>
        Log out
      </Button>
    </div>
  )
}
