import { useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'

/**
 * Shown when the API answers 401: the user's session is no longer accepted.
 *
 * The app may still think the user is signed in (e.g. the token was revoked), and
 * GuestRoute keeps signed-in users away from /login. So the link signs out first,
 * then opens /login with `from` set, so logging in brings the user back here.
 */
export default function SessionEndedMessage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Stops a double click from signing out twice.
  const isSigningOutRef = useRef(false)

  async function handleSignInAgain(event) {
    event.preventDefault()
    if (isSigningOutRef.current) return
    isSigningOutRef.current = true

    // Supabase reports most failures in `error` rather than throwing, and clears the
    // local session even when the sign-out request itself fails. Either way, carry
    // on to the login page: it's the only way forward.
    try {
      const { error } = (await signOut()) ?? {}
      if (error) console.error('Sign out failed:', error)
    } catch (err) {
      console.error('Sign out failed:', err)
    }
    navigate('/login', { replace: true, state: { from: location } })
    isSigningOutRef.current = false
  }

  return (
    <p>
      Your session has ended.{' '}
      <Link to="/login" state={{ from: location }} onClick={handleSignInAgain}>
        Sign in again.
      </Link>
    </p>
  )
}
