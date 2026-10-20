// Checks vercel.json does what the README's Deployment section says (US-34): every
// page's URL serves the app, so a refresh or a shared link works, while page code and
// API paths are never swapped for index.html.

import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'
import vercel from '../vercel.json'
import appSource from './App.jsx?raw'

const appRoutes = [...appSource.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1])

// Vercel's source patterns are path-to-regexp; this one is a single regex group.
const [fallback] = vercel.rewrites
const servesApp = (path) => new RegExp(`^${fallback.source}$`).test(path)

describe('vercel.json', () => {
  it('builds the Vite app into dist with npm ci', () => {
    expect(vercel).toMatchObject({
      framework: 'vite',
      installCommand: 'npm ci',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
    })
    expect(vercel.rewrites).toHaveLength(1)
    expect(fallback.destination).toBe('/index.html')
  })

  it('serves the app for every route in App.jsx', () => {
    expect(appRoutes).toEqual(expect.arrayContaining(['/transactions', '/summary', '/budgets', '/login']))
    for (const route of appRoutes) {
      expect(servesApp(route), route).toBe(true)
    }
  })

  it.each(['/summary/', '/transactions/anything', '/not-a-page'])('serves the app for %s too, so React Router decides what to show', (path) => {
    expect(servesApp(path)).toBe(true)
  })

  it.each(['/assets/SummaryPage-abc123.js', '/assets/index-abc123.css', '/api/transactions'])(
    'never answers %s with index.html, so a missing file is a real 404',
    (path) => {
      expect(servesApp(path)).toBe(false)
    }
  )

  it('caches hashed page code for a year and always revalidates index.html', () => {
    const header = (source) => vercel.headers.find((rule) => rule.source === source)?.headers[0]

    expect(header('/assets/(.*)')).toEqual({ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' })
    expect(header('/index.html')).toEqual({ key: 'Cache-Control', value: 'no-cache' })
  })
})

describe('Node version', () => {
  it('is 22, as on the host', () => {
    expect(packageJson.engines.node).toBe('22.x')
  })
})
