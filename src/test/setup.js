// Runs before every test file (see the `test` block in vite.config.js).

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { resetFakeSupabase } from './fakeSupabase'

// The real client needs the Supabase URL and key from .env and would call Supabase.
vi.mock('../lib/supabase', async () => (await import('./fakeSupabase')).fakeSupabaseModule)

beforeEach(() => {
  resetFakeSupabase()
})

afterEach(() => {
  cleanup()
})
