// Runs before every test file (see the `test` block in vite.config.js).

import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { resetFakeSupabase } from './fakeSupabase'

// Pages are lazy-loaded (App.jsx). The first test in a file waits for its page's code
// to be compiled, which can take more than Testing Library's default 1 second when
// every file runs at once. Waiting longer only slows down a test that's failing.
configure({ asyncUtilTimeout: 5000 })

// The real client needs the Supabase URL and key from .env and would call Supabase.
vi.mock('../lib/supabase', async () => (await import('./fakeSupabase')).fakeSupabaseModule)

beforeEach(() => {
  resetFakeSupabase()
})

afterEach(() => {
  cleanup()
})
