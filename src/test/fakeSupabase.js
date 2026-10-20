// Stand-in for the Supabase client in src/lib/supabase.js, installed for every test by
// src/test/setup.js. It keeps one session in memory and tells AuthContext about sign-in
// and sign-out the way Supabase does, so tests never reach Supabase.

import { vi } from 'vitest'

const TEST_SESSION = Object.freeze({
  access_token: 'test-access-token',
  user: Object.freeze({ email: 'me@example.com' }),
})

const state = { session: null, listener: null }

function setSession(event, session) {
  state.session = session
  state.listener?.(event, session)
}

export const fakeAuth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}

/** Resets every fake method. Signed in as TEST_SESSION unless `session` says otherwise. */
export function resetFakeSupabase({ session = TEST_SESSION } = {}) {
  state.session = session
  state.listener = null

  fakeAuth.getSession.mockReset().mockImplementation(async () => ({ data: { session: state.session }, error: null }))
  fakeAuth.onAuthStateChange.mockReset().mockImplementation((callback) => {
    state.listener = callback
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
  fakeAuth.signOut.mockReset().mockImplementation(async () => {
    setSession('SIGNED_OUT', null)
    return { error: null }
  })
  fakeAuth.signInWithPassword.mockReset().mockImplementation(async () => {
    setSession('SIGNED_IN', TEST_SESSION)
    return { data: { session: TEST_SESSION, user: TEST_SESSION.user }, error: null }
  })
  fakeAuth.signUp.mockReset().mockImplementation(async () => {
    setSession('SIGNED_IN', TEST_SESSION)
    return { data: { session: TEST_SESSION, user: TEST_SESSION.user }, error: null }
  })
}

/** Ends the session from outside the app, as when it expires in another tab. */
export function endSession() {
  setSession('SIGNED_OUT', null)
}

// The module that replaces src/lib/supabase.js.
export const fakeSupabaseModule = { supabase: { auth: fakeAuth } }
